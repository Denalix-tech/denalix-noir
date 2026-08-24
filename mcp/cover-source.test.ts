import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { DENALIX_BRAND } from "./brand";
import { COVER_HEIGHT, COVER_WIDTH } from "./cover-image";
import { generatedAltText, resolveCover, type CoverDeps } from "./cover-source";
import { ImageGenerateError, buildImagePrompt, generateCoverArtwork } from "./image-generate";
import { env } from "./lib";
import { postInputSchema } from "../src/lib/blog/schema";

/**
 * Cover source selection.
 *
 * The provider boundary is injected everywhere, so this suite never issues a
 * paid image request or touches the network. What it does exercise for real is
 * sharp: the dimension assertions decode the actual output, because "1200x630
 * WebP" is the one claim the tool makes that a mock could quietly falsify.
 *
 * Run with `npm run test:cover`.
 */

const BASE = {
  title: "Scheduling that survives a busy Monday",
  slug: "scheduling-that-survives-a-busy-monday",
  eyebrow: "Workflow Automation",
  siteName: "Denalix Tech",
  brand: DENALIX_BRAND,
};

/**
 * A real 4:3 PNG with noise, so sharp has genuine bytes to decode and crop.
 *
 * Noisy rather than flat on purpose: a flat 64x48 fill compresses to 177 bytes,
 * which `generateCoverArtwork` correctly rejects as too small to be a real
 * image. A fixture that trips a production guard tests the fixture, not the code.
 */
async function tinyPng(): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const width = 256;
  const height = 192;
  const pixels = Buffer.allocUnsafe(width * height * 3);
  for (let i = 0; i < pixels.length; i += 1) {
    // Deterministic pseudo-noise: incompressible enough to be realistic, and
    // identical on every run so failures are reproducible.
    pixels[i] = (i * 2654435761) % 251;
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

async function probe(image: Buffer) {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(image).metadata();
  return { width: meta.width, height: meta.height, format: meta.format };
}

/** Never reached unless a test's ordering assumption is wrong. */
const forbiddenImport: CoverDeps["importImage"] = async () => {
  throw new Error("importImage should not have been called");
};
const forbiddenGenerate: CoverDeps["generate"] = async () => {
  throw new Error("generate should not have been called");
};

function generatorReturning(bytes: Buffer, model = "gpt-image-2"): CoverDeps["generate"] {
  return async () => ({ bytes, model });
}

describe("cover source selection", () => {
  // resolveCover consults the real env for the configured check unless it is
  // overridden, so the key is pinned for the suite and restored afterwards.
  const originalKey = env.OPENAI_API_KEY;
  before(() => {
    env.OPENAI_API_KEY = "test-key-not-used-for-any-request";
  });
  after(() => {
    env.OPENAI_API_KEY = originalKey;
  });

  it("1. generates artwork when no imageUrl is supplied", async () => {
    const png = await tinyPng();
    const result = await resolveCover(BASE, {
      importImage: forbiddenImport,
      generate: generatorReturning(png),
    });

    assert.equal(result.source, "generated-image");
    assert.equal(result.fellBackToBrandCover, false);
    assert.equal(result.model, "gpt-image-2");
    assert.equal(result.reason, undefined);
  });

  it("2. prefers a valid explicit imageUrl over generation", async () => {
    const png = await tinyPng();
    const result = await resolveCover(
      { ...BASE, imageUrl: "https://example.com/art.png", imageAlt: "A workshop scheduling board" },
      {
        importImage: async () => ({ image: png, sourceBytes: png.length, sourceType: "image/png" }),
        // Proves generation is not even attempted when the import succeeds.
        generate: forbiddenGenerate,
      },
    );

    assert.equal(result.source, "imported-image");
    assert.equal(result.fellBackToBrandCover, false);
    assert.equal(result.alt, "A workshop scheduling board");
  });

  it("3. falls forward to generated artwork when an explicit import fails", async () => {
    const png = await tinyPng();
    const result = await resolveCover(
      { ...BASE, imageUrl: "https://example.com/gone.png" },
      {
        importImage: async () => {
          throw new Error("imageUrl returned 404.");
        },
        generate: generatorReturning(png),
      },
    );

    assert.equal(result.source, "generated-image");
    assert.equal(result.fellBackToBrandCover, false);
    // The caller asked for a specific image and must be told it was not used.
    assert.match(result.warning ?? "", /could not be used/);
    assert.match(result.warning ?? "", /404/);
  });

  it("4. falls back to the brand cover when OPENAI_API_KEY is absent", async () => {
    const result = await resolveCover(BASE, {
      importImage: forbiddenImport,
      generate: forbiddenGenerate,
      generationConfigured: () => false,
    });

    assert.equal(result.source, "composed-brand-cover");
    assert.equal(result.fellBackToBrandCover, true);
    assert.equal(result.attemptedSource, "generated-image");
    assert.match(result.reason ?? "", /OPENAI_API_KEY/);
  });

  it("5. falls back to the brand cover on a provider timeout or error", async () => {
    for (const failure of [
      new ImageGenerateError("Image provider call failed: Request timed out."),
      new Error("503 Service Unavailable"),
    ]) {
      const result = await resolveCover(BASE, {
        importImage: forbiddenImport,
        generate: async () => {
          throw failure;
        },
      });

      assert.equal(result.source, "composed-brand-cover");
      assert.equal(result.fellBackToBrandCover, true);
      assert.equal(result.attemptedSource, "generated-image");
      assert.ok((result.reason ?? "").length > 0);
    }
  });

  it("6. falls back to the brand cover when generated bytes are not an image", async () => {
    const result = await resolveCover(BASE, {
      importImage: forbiddenImport,
      // Well-formed base64 that decodes to non-image bytes: sharp must reject it,
      // and that rejection must be caught rather than failing the tool.
      generate: generatorReturning(Buffer.from("this is definitely not a png".repeat(64))),
    });

    assert.equal(result.source, "composed-brand-cover");
    assert.equal(result.fellBackToBrandCover, true);
    assert.equal(result.attemptedSource, "generated-image");
  });

  it("7. produces exactly 1200x630 WebP on every source", async () => {
    const png = await tinyPng();

    const generated = await resolveCover(BASE, {
      importImage: forbiddenImport,
      generate: generatorReturning(png),
    });
    const imported = await resolveCover(
      { ...BASE, imageUrl: "https://example.com/art.png" },
      {
        importImage: async () => {
          // The import path normalises inside fetchExternalImage, which is stubbed
          // here, so feed it an already-normalised buffer to assert the contract.
          const sharp = (await import("sharp")).default;
          const image = await sharp(png)
            .resize(COVER_WIDTH, COVER_HEIGHT, { fit: "cover" })
            .webp()
            .toBuffer();
          return { image, sourceBytes: png.length, sourceType: "image/png" };
        },
        generate: forbiddenGenerate,
      },
    );
    const brand = await resolveCover(BASE, {
      importImage: forbiddenImport,
      generate: forbiddenGenerate,
      generationConfigured: () => false,
    });

    for (const [name, result] of [
      ["generated", generated],
      ["imported", imported],
      ["brand", brand],
    ] as const) {
      const meta = await probe(result.image);
      assert.equal(meta.width, COVER_WIDTH, `${name} width`);
      assert.equal(meta.height, COVER_HEIGHT, `${name} height`);
      assert.equal(meta.format, "webp", `${name} format`);
    }
  });

  it("8. returns alt text appropriate to the actual source", async () => {
    const png = await tinyPng();

    const generated = await resolveCover(BASE, {
      importImage: forbiddenImport,
      generate: generatorReturning(png),
    });
    assert.equal(generated.alt, generatedAltText(BASE.title));
    assert.match(generated.alt, /Editorial illustration representing/);

    const withCallerAlt = await resolveCover(
      { ...BASE, imageAlt: "  A dispatcher at a scheduling board  " },
      { importImage: forbiddenImport, generate: generatorReturning(png) },
    );
    assert.equal(withCallerAlt.alt, "A dispatcher at a scheduling board");

    // The fallback must NOT reuse alt text written for artwork that was never
    // produced — it would describe an image the reader is not looking at.
    const brand = await resolveCover(
      { ...BASE, imageAlt: "A dispatcher at a scheduling board" },
      {
        importImage: forbiddenImport,
        generate: forbiddenGenerate,
        generationConfigured: () => false,
      },
    );
    assert.notEqual(brand.alt, "A dispatcher at a scheduling board");
    assert.match(brand.alt, /Denalix Tech article cover/);
  });

  it("9. create_draft accepts the returned url and alt unchanged", async () => {
    const png = await tinyPng();
    const cover = await resolveCover(BASE, {
      importImage: forbiddenImport,
      generate: generatorReturning(png),
    });

    const uploadedUrl =
      "https://vuqxdkbktdimzpyfiict.supabase.co/storage/v1/object/public/blog-images/covers/x-abc.webp";

    const parsed = postInputSchema.safeParse({
      title: BASE.title,
      slug: BASE.slug,
      excerpt: "How to keep a schedule intact when the day goes sideways.",
      content: "## The problem\n\nA busy Monday breaks a fragile schedule.",
      coverImageUrl: uploadedUrl,
      coverImageAlt: cover.alt,
      seoTitle: "",
      seoDescription: "",
    });

    assert.equal(parsed.success, true, JSON.stringify(parsed.error?.issues ?? []));
  });
});

describe("prompt construction", () => {
  it("carries the article subject, brand palette, and the hard constraints", () => {
    const prompt = buildImagePrompt({
      title: BASE.title,
      eyebrow: BASE.eyebrow,
      siteName: BASE.siteName,
      brand: DENALIX_BRAND,
    });

    assert.match(prompt, /Scheduling that survives a busy Monday/);
    assert.match(prompt, /Workflow Automation/);
    assert.match(prompt, /Denalix Tech/);
    assert.ok(prompt.includes(DENALIX_BRAND.accent), "brand accent colour is in the prompt");
    assert.ok(prompt.includes(DENALIX_BRAND.ink), "brand ink colour is in the prompt");
    assert.match(prompt, /no text, letters, numbers/);
    assert.match(prompt, /no logos/);
    assert.match(prompt, /no watermarks/);
    assert.match(prompt, /statistics, metrics/);
    assert.match(prompt, /avoid science-fiction/);
    assert.match(prompt, /thumbnail/);
  });

  it("folds caller direction in without dropping the constraints", () => {
    const prompt = buildImagePrompt({
      title: BASE.title,
      siteName: BASE.siteName,
      brand: DENALIX_BRAND,
      imagePrompt: "a dispatcher reviewing a wall-mounted job board",
    });

    assert.match(prompt, /dispatcher reviewing a wall-mounted job board/);
    assert.match(prompt, /no logos/);
    assert.match(prompt, /no text, letters, numbers/);
  });
});

describe("provider response handling", () => {
  const originalKey = env.OPENAI_API_KEY;
  after(() => {
    env.OPENAI_API_KEY = originalKey;
  });

  it("rejects an empty provider result", async () => {
    await assert.rejects(
      generateCoverArtwork(
        { title: BASE.title, siteName: BASE.siteName, brand: DENALIX_BRAND },
        { createImage: async () => ({ b64: null }) },
      ),
      (err: unknown) =>
        err instanceof ImageGenerateError && /no image data/.test((err as Error).message),
    );
  });

  it("rejects base64 that decodes to too few bytes", async () => {
    await assert.rejects(
      generateCoverArtwork(
        { title: BASE.title, siteName: BASE.siteName, brand: DENALIX_BRAND },
        { createImage: async () => ({ b64: Buffer.from("tiny").toString("base64") }) },
      ),
      (err: unknown) =>
        err instanceof ImageGenerateError && /not a usable image/.test((err as Error).message),
    );
  });

  it("wraps a provider throw without leaking the raw error object", async () => {
    await assert.rejects(
      generateCoverArtwork(
        { title: BASE.title, siteName: BASE.siteName, brand: DENALIX_BRAND },
        {
          createImage: async () => {
            throw new Error("401 Incorrect API key provided: sk-live-abcdef");
          },
        },
      ),
      (err: unknown) =>
        err instanceof ImageGenerateError &&
        /Image provider call failed/.test((err as Error).message),
    );
  });

  it("refuses to run without a key when no provider is injected", async () => {
    env.OPENAI_API_KEY = "";
    await assert.rejects(
      generateCoverArtwork({ title: BASE.title, siteName: BASE.siteName, brand: DENALIX_BRAND }),
      (err: unknown) =>
        err instanceof ImageGenerateError && /OPENAI_API_KEY/.test((err as Error).message),
    );
  });

  it("returns provider bytes and the configured model on success", async () => {
    env.OPENAI_API_KEY = "test-key";
    const png = await tinyPng();
    const result = await generateCoverArtwork(
      { title: BASE.title, siteName: BASE.siteName, brand: DENALIX_BRAND },
      { createImage: async () => ({ b64: png.toString("base64") }) },
    );

    assert.equal(result.model, "gpt-image-2");
    assert.ok(result.bytes.length >= 1024);
  });
});

describe("draft-only safeguards", () => {
  it("exposes no publish function from the storage adapter", async () => {
    const db = await import("./adapters/supabase");
    const exported = Object.keys(db);
    for (const name of exported) {
      assert.ok(
        !/publish/i.test(name),
        `adapters/supabase must export nothing publish-shaped, found ${name}`,
      );
    }
  });

  it("hard-codes draft status in create_draft", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("./adapters/supabase.ts", import.meta.url), "utf8");
    assert.match(source, /status:\s*["']draft["']/);
  });
});
