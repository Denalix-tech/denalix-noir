import { env } from "./lib";
import type { Brand } from "./brand";

/**
 * Original cover artwork from the OpenAI Image API.
 *
 * This is the default source for `generate_cover_image`. The typographic brand
 * cover in `cover-image.ts` is the fallback beneath it, not the normal result.
 *
 * Three properties matter more than the feature itself, because this sits in the
 * middle of a blog workflow that must not break:
 *
 *   * **It never throws past its own boundary for a provider problem.** Every
 *     failure — missing key, timeout, HTTP error, empty result, bad base64,
 *     unusable bytes — surfaces as `ImageGenerateError`, which the caller turns
 *     into a brand-cover fallback. A post with a cover beats an error.
 *   * **One attempt, bounded.** `maxRetries: 0` and an explicit timeout, because
 *     each call costs money and a stuck request would hold a serverless
 *     invocation open to its 60s ceiling.
 *   * **Nothing sensitive is logged or returned.** No key, no Authorization
 *     header, no base64 payload. Provider messages are truncated before they
 *     travel, since they can echo the prompt back.
 *
 * The provider call is injected (`GenerateDeps`) so the selection logic and the
 * decode path can be tested without spending anything.
 */

/** Wide landscape is the closest supported ratio to the 1200x630 cover. */
const IMAGE_SIZE = "1536x1024";

/** One image per tool call. Never raise this — it multiplies cost per draft. */
const IMAGE_COUNT = 1;

const DEFAULT_MODEL = "gpt-image-2";

/** Cost-conscious. `high` roughly doubles the bill for artwork shown at 1200px. */
const DEFAULT_QUALITY = "medium";

const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Ceiling on the decoded provider image, before sharp sees it.
 *
 * Generous next to a real 1536x1024 PNG and small enough that a malformed or
 * hostile response cannot balloon a serverless invocation.
 */
const MAX_GENERATED_BYTES = 12 * 1024 * 1024;

/** Provider text can restate the prompt, so it is clipped before it is surfaced. */
const MAX_REASON_CHARS = 300;

export class ImageGenerateError extends Error {}

export type GenerateCoverInput = {
  title: string;
  eyebrow?: string;
  siteName: string;
  brand: Brand;
  /** Caller's extra direction for subject and composition. Never relaxes the rules below. */
  imagePrompt?: string;
};

export type GeneratedCover = {
  /** Raw provider bytes. Normalising to 1200x630 WebP is the caller's job. */
  bytes: Buffer;
  model: string;
};

/** The provider boundary. Swapped in tests; never mocked in production code. */
export type GenerateDeps = {
  createImage: (request: {
    model: string;
    prompt: string;
    size: string;
    quality: string;
    n: number;
  }) => Promise<{ b64: string | null }>;
};

export function isImageGenerationConfigured(): boolean {
  return Boolean(env.OPENAI_API_KEY?.trim());
}

export function configuredImageModel(): string {
  return env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
}

function configuredQuality(): string {
  return env.OPENAI_IMAGE_QUALITY?.trim() || DEFAULT_QUALITY;
}

/** Truncated and stripped of newlines, so a provider message cannot flood a log line. */
function sanitizeReason(value: unknown): string {
  const raw = value instanceof Error ? value.message : String(value);
  const flat = raw.replace(/\s+/g, " ").trim();
  return flat.length > MAX_REASON_CHARS ? `${flat.slice(0, MAX_REASON_CHARS)}…` : flat;
}

/**
 * The prompt.
 *
 * Written as constraints rather than adjectives, because the failure modes here
 * are specific and repeatable: models add title text unless told not to, invent
 * logos, drift to science fiction on anything involving "AI", and produce busy
 * compositions that turn to mush in a 400px index card.
 *
 * The no-text rule is doubly load-bearing. Rendered text in a cover is usually
 * misspelled, and it would collide with the real title displayed above it.
 */
export function buildImagePrompt(input: GenerateCoverInput): string {
  const { title, eyebrow, siteName, brand, imagePrompt } = input;

  const subject = [
    `Editorial cover illustration for a blog article titled "${title}".`,
    eyebrow ? `The article's topic area is ${eyebrow}.` : "",
    `It is published by ${siteName}, a business technology company.`,
    imagePrompt?.trim()
      ? `Additional art direction for the subject and composition: ${imagePrompt.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const style = [
    "Style: a polished, conceptual editorial illustration that depicts the article's actual subject.",
    `Palette: near-black background (${brand.ink}), warm gold accent (${brand.accent}), soft off-white (${brand.foreground}), muted grey (${brand.muted}).`,
    "Depict practical business technology — real work, systems, data, and people using tools.",
    "Wide landscape composition suited to a website blog cover banner.",
    "A single clear focal idea with generous negative space, legible when scaled down to a small thumbnail.",
  ].join(" ");

  const constraints = [
    "Hard requirements:",
    "no text, letters, numbers, words, captions, or titles anywhere in the image;",
    "no logos, wordmarks, brand marks, or imitations of any real company's identity;",
    "no watermarks or signatures;",
    "no charts, dashboards, or figures implying specific statistics, metrics, or results;",
    "no recognisable real people, customer names, or company names;",
    "avoid science-fiction and cyberpunk tropes — no glowing blue holograms, humanoid robots, floating brains, or neural-network gimmickry;",
    "avoid generic stock-photo clichés such as handshakes or rising arrow graphs.",
  ].join(" ");

  return `${subject}\n\n${style}\n\n${constraints}`;
}

/**
 * The real provider, built lazily.
 *
 * The SDK is imported inside the function for the same reason sharp is: a
 * module-scope import puts a third-party package on the load path of
 * `/api/mcp`, and anything that throws there kills the route before it can
 * report why. See the note in `sites.ts`.
 */
async function openAiDeps(apiKey: string): Promise<GenerateDeps> {
  const { default: OpenAI } = await import("openai");

  const client = new OpenAI({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    // One paid attempt per cover. The SDK retries by default, which would bill
    // twice for a request that was already going to fail.
    maxRetries: 0,
  });

  return {
    async createImage(request) {
      const response = await client.images.generate({
        model: request.model,
        prompt: request.prompt,
        size: request.size,
        quality: request.quality as "low" | "medium" | "high" | "auto",
        n: request.n,
      });
      return { b64: response.data?.[0]?.b64_json ?? null };
    },
  };
}

/**
 * Generates one cover image, or throws `ImageGenerateError` with a sanitized
 * reason. Returns provider bytes; the caller normalises them to 1200x630 WebP.
 */
export async function generateCoverArtwork(
  input: GenerateCoverInput,
  deps?: GenerateDeps,
): Promise<GeneratedCover> {
  const apiKey = env.OPENAI_API_KEY?.trim();

  // Injected deps are honoured without a key so tests never need one; the real
  // path cannot proceed without one.
  if (!deps && !apiKey) {
    throw new ImageGenerateError(
      "OPENAI_API_KEY is not set, so original artwork cannot be generated.",
    );
  }

  const model = configuredImageModel();
  const prompt = buildImagePrompt(input);

  let b64: string | null;
  try {
    const provider = deps ?? (await openAiDeps(apiKey as string));
    const result = await provider.createImage({
      model,
      prompt,
      size: IMAGE_SIZE,
      quality: configuredQuality(),
      n: IMAGE_COUNT,
    });
    b64 = result.b64;
  } catch (err) {
    throw new ImageGenerateError(`Image provider call failed: ${sanitizeReason(err)}`);
  }

  if (!b64 || typeof b64 !== "string" || b64.trim() === "") {
    throw new ImageGenerateError("Image provider returned no image data.");
  }

  // Decoded before the length check so a padded or truncated payload is caught
  // here rather than inside sharp.
  let bytes: Buffer;
  try {
    bytes = Buffer.from(b64, "base64");
  } catch (err) {
    throw new ImageGenerateError(`Image provider returned invalid base64: ${sanitizeReason(err)}`);
  }

  // Buffer.from never throws on malformed base64 — it silently drops invalid
  // characters — so an empty or implausibly small result is the real signal.
  if (bytes.length < 1024) {
    throw new ImageGenerateError(
      `Image provider returned ${bytes.length} bytes, which is not a usable image.`,
    );
  }

  if (bytes.length > MAX_GENERATED_BYTES) {
    throw new ImageGenerateError(
      `Image provider returned ${bytes.length} bytes, over the ${Math.floor(
        MAX_GENERATED_BYTES / 1024 / 1024,
      )} MB ceiling.`,
    );
  }

  return { bytes, model };
}
