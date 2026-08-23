/**
 * Image type detection from leading bytes.
 *
 * Shared by the admin upload action and the MCP cover ingestion, so both agree on
 * what counts as an image. Pure and dependency-free: no `server-only`, so it can
 * be exercised directly and imported from the plain-Node MCP process.
 *
 * Sniffed from content rather than trusted from a filename or a `Content-Type`
 * header, because both are attacker-controlled. Renaming `payload.svg` to
 * `photo.png`, or serving SVG with `content-type: image/png`, must not get past
 * this — an SVG in an image slot is a script-execution vector.
 */

/**
 * Largest image accepted as *input*. Both upload paths re-encode to a small
 * WebP before anything is stored, so this bounds decode work rather than the
 * stored object.
 *
 * Two other limits have to stay above this one, and both have bitten:
 *
 *   * `experimental.serverActions.bodySizeLimit` in `next.config.ts`. Next
 *     enforces it before the action body runs, so a value below this one makes
 *     the check here unreachable and uploads fail with no usable message.
 *   * The `blog-images` bucket's `file_size_limit`, which applies to the
 *     re-encoded WebP — comfortably clear at cover size.
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Decode ceiling for sharp, in pixels.
 *
 * A byte cap alone does not bound decode cost: a highly compressible PNG of a
 * few hundred KB can declare enormous dimensions and expand to gigabytes in
 * memory. sharp's own default is ~268 MP, far more than a 1200x630 cover could
 * ever need. 64 MP still clears any real photograph or AI-generated image.
 */
export const MAX_IMAGE_PIXELS = 64_000_000;

export type SniffedImage = {
  mime: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
};

export function sniffImageType(bytes: Uint8Array): SniffedImage | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((byte, i) => bytes[i] === byte)) {
    return { mime: "image/png", ext: "png" };
  }

  // WebP: "RIFF" .... "WEBP"
  if (bytes.length >= 12) {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    if (riff === "RIFF" && webp === "WEBP") {
      return { mime: "image/webp", ext: "webp" };
    }
  }

  return null;
}
