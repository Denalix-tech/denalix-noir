import type { Brand } from "./brand";
import { coverAltText, normaliseToCoverWebp, renderCoverWebp } from "./cover-image";
import { fetchExternalImage } from "./image-fetch";
import {
  ImageGenerateError,
  generateCoverArtwork,
  isImageGenerationConfigured,
} from "./image-generate";
import { MAX_IMAGE_PIXELS } from "../src/lib/blog/image-type";

/**
 * Chooses where a cover comes from, in one place.
 *
 * The order is: an explicitly supplied `imageUrl`, then original generated
 * artwork, then the typographic brand cover. Generated artwork is the default —
 * the brand cover is what you get when generation is unavailable or fails, not
 * what you get by asking for nothing.
 *
 * This lives apart from `tools.ts` because the ordering is the part worth
 * testing, and testing it through the MCP tool surface would mean standing up a
 * server and a database for what is really a decision table. The two fallible
 * sources are injected, so every branch is reachable without a network call or a
 * paid request.
 *
 * **It resolves to a usable cover whenever `renderCoverWebp` works.** Nothing
 * below rethrows a source failure; each one is recorded and the next source is
 * tried. Only a storage failure can fail the tool, and that happens in the
 * caller — with no upload there is no URL to attach either way.
 */

export type CoverSource = "imported-image" | "generated-image" | "composed-brand-cover";

export type CoverRequest = {
  title: string;
  slug: string;
  eyebrow?: string;
  siteName: string;
  brand: Brand;
  /** Public https artwork to import. Tried first when present. */
  imageUrl?: string;
  /** Alt text for imported or generated artwork. Overrides the derived text. */
  imageAlt?: string;
  /** Extra art direction for generation. Never relaxes the prompt's constraints. */
  imagePrompt?: string;
};

export type CoverResult = {
  image: Buffer;
  alt: string;
  source: CoverSource;
  fellBackToBrandCover: boolean;
  /** Present on the fallback: which source was tried and lost. */
  attemptedSource?: Exclude<CoverSource, "composed-brand-cover">;
  /** Present on the fallback: sanitized reason the attempted source failed. */
  reason?: string;
  /** Present when an explicit import failed but a later source succeeded. */
  warning?: string;
  /** Model identifier, for generated artwork only. */
  model?: string;
  /** Byte length of the imported original, for the compression note. */
  sourceBytes?: number;
};

/** Both fallible sources, injectable for tests. */
export type CoverDeps = {
  importImage: typeof fetchExternalImage;
  generate: (
    input: Parameters<typeof generateCoverArtwork>[0],
  ) => ReturnType<typeof generateCoverArtwork>;
  /** Reports whether generation is configured, so a missing key is a clean skip. */
  generationConfigured: () => boolean;
};

const defaultDeps: CoverDeps = {
  importImage: fetchExternalImage,
  generate: (input) => generateCoverArtwork(input),
  generationConfigured: isImageGenerationConfigured,
};

/**
 * Alt text for artwork whose content this server cannot describe.
 *
 * Deterministic and honest. The image model is never asked to write it: it would
 * describe what it intended to draw rather than what it drew, and accessibility
 * text that confidently misdescribes an image is worse than plain text.
 */
export function generatedAltText(title: string): string {
  return `Editorial illustration representing “${title}”.`;
}

function reasonFrom(err: unknown): string {
  if (err instanceof ImageGenerateError) return err.message;
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/\s+/g, " ").trim();
}

export async function resolveCover(
  request: CoverRequest,
  overrides: Partial<CoverDeps> = {},
): Promise<CoverResult> {
  const deps: CoverDeps = { ...defaultDeps, ...overrides };
  const { title, slug, eyebrow, siteName, brand, imageUrl, imageAlt, imagePrompt } = request;

  // Carried forward if an explicit import fails: the caller asked for a specific
  // image and deserves to know it was not used, even when a later source works.
  let importWarning: string | undefined;

  // ---- 1. Explicit imageUrl -------------------------------------------------
  if (imageUrl) {
    try {
      const fetched = await deps.importImage(imageUrl);
      return {
        image: fetched.image,
        alt: imageAlt?.trim() || importedAltFallback(),
        source: "imported-image",
        fellBackToBrandCover: false,
        sourceBytes: fetched.sourceBytes,
      };
    } catch (err) {
      importWarning = `The supplied imageUrl could not be used: ${reasonFrom(err)}`;
    }
  }

  // ---- 2. Generated artwork (the default) ----------------------------------
  let generationReason: string;

  if (!deps.generationConfigured()) {
    generationReason = "OPENAI_API_KEY is not set, so original artwork cannot be generated.";
  } else {
    try {
      const generated = await deps.generate({ title, eyebrow, siteName, brand, imagePrompt });
      const image = await normaliseToCoverWebp(generated.bytes, MAX_IMAGE_PIXELS);
      return {
        image,
        alt: imageAlt?.trim() || generatedAltText(title),
        source: "generated-image",
        fellBackToBrandCover: false,
        model: generated.model,
        ...(importWarning ? { warning: importWarning } : {}),
      };
    } catch (err) {
      // Covers provider failures and anything sharp rejects about the bytes.
      generationReason = reasonFrom(err);
    }
  }

  // ---- 3. Typographic brand cover (final fallback) -------------------------
  const image = await renderCoverWebp({ title, slug, eyebrow, brand });

  return {
    image,
    // Not imageAlt: that described artwork which is not what was produced. The
    // brand cover's own alt text is accurate for the brand cover.
    alt: coverAltText(title, brand.wordmark),
    source: "composed-brand-cover",
    fellBackToBrandCover: true,
    attemptedSource: "generated-image",
    reason: generationReason,
    ...(importWarning ? { warning: importWarning } : {}),
  };
}

/**
 * Used when a caller imports artwork without describing it.
 *
 * Deliberately not a guess at the content. An imported image could be anything,
 * and inventing a description would put a false statement into the page for the
 * readers who most depend on it being true.
 */
function importedAltFallback(): string {
  return "Cover image for this article. Replace this alt text with a description of what the image shows.";
}
