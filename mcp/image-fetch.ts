import { lookup } from "node:dns/promises";
import { isIP } from "node:net";


import { normaliseToCoverWebp } from "./cover-image";
import { MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS, sniffImageType } from "../src/lib/blog/image-type";

/**
 * Fetches a caller-supplied image URL and normalises it to cover dimensions.
 *
 * This exists so a chatbot that can host an image somewhere public — or a human
 * with a URL — can supply real artwork instead of the composed typographic cover.
 *
 * **The URL comes from a language model, so it is hostile input.** An unguarded
 * server-side fetch of a model-chosen URL is a server-side request forgery
 * primitive: the obvious target is cloud instance metadata at 169.254.169.254,
 * which on many hosts returns credentials. Every restriction below exists for
 * that reason, not for tidiness:
 *
 *   * https only — no file:, no http:, no gopher:
 *   * the resolved address must be publicly routable; loopback, private, and
 *     link-local ranges are refused after DNS resolution, so a hostname that
 *     resolves to 127.0.0.1 does not slip through
 *   * redirects are not followed, because each hop would need re-validating and
 *     a redirect to a private address is the standard bypass
 *   * a hard byte cap enforced while streaming, so a huge response cannot be
 *     used to exhaust memory
 *   * a timeout, so a hanging server cannot pin the request open
 *   * the type is sniffed from the bytes, never from Content-Type
 */

const FETCH_TIMEOUT_MS = 15_000;

/** Refuses anything not publicly routable. Checked post-DNS, on the real address. */
function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const v6 = address.toLowerCase();
    if (v6 === "::1" || v6 === "::") return true;
    // Unique-local fc00::/7 and link-local fe80::/10.
    if (/^f[cd]/.test(v6) || /^fe[89ab]/.test(v6)) return true;
    // IPv4-mapped, e.g. ::ffff:127.0.0.1 — recurse on the embedded address.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }

  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts;

  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // "this network"
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true; // multicast and reserved

  return false;
}

export type FetchedImage = { image: Buffer; sourceBytes: number; sourceType: string };

export class ImageFetchError extends Error {}

export async function fetchExternalImage(rawUrl: string): Promise<FetchedImage> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ImageFetchError("imageUrl is not a valid absolute URL.");
  }

  if (url.protocol !== "https:") {
    throw new ImageFetchError("imageUrl must use https.");
  }

  // Resolve first and check the address, so a hostname pointing at a private
  // range is rejected before any connection is made.
  let resolved: string;
  try {
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    resolved = isIP(hostname) ? hostname : (await lookup(hostname)).address;
  } catch {
    throw new ImageFetchError(`Could not resolve ${url.hostname}.`);
  }

  if (isPrivateAddress(resolved)) {
    throw new ImageFetchError(
      "imageUrl resolves to a private or loopback address, which is not allowed.",
    );
  }

  let response: Response;
  try {
    response = await fetch(url, {
      // Not "follow": a redirect target would need the same DNS and range checks,
      // and redirect-to-private-IP is the usual way around a guard like this.
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: "image/png,image/jpeg,image/webp" },
    });
  } catch {
    throw new ImageFetchError("Could not fetch imageUrl (timed out or refused).");
  }

  if (response.status >= 300 && response.status < 400) {
    throw new ImageFetchError(
      "imageUrl redirected. Supply the final URL directly — redirects are not followed.",
    );
  }

  if (!response.ok) {
    throw new ImageFetchError(
      `imageUrl returned ${response.status}. ChatGPT's own image URLs are not publicly readable, so they cannot be used here.`,
    );
  }

  // Streamed with a running total, so an over-large body is abandoned rather than
  // buffered in full. Content-Length is advisory and may be absent or lie.
  const chunks: Uint8Array[] = [];
  let total = 0;

  if (!response.body) throw new ImageFetchError("imageUrl returned an empty response.");

  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new ImageFetchError(
        `Image exceeds ${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`,
      );
    }
    chunks.push(value);
  }

  const bytes = Buffer.concat(chunks);
  const sniffed = sniffImageType(bytes);

  if (!sniffed) {
    throw new ImageFetchError(
      "That URL is not a PNG, JPEG, or WebP image. SVG is refused deliberately.",
    );
  }

  // Re-encoded rather than passed through: normalises to cover dimensions, and
  // rasterising through sharp discards any metadata or trailing payload the
  // original file carried.
  //
  // WebP at quality 82, not PNG. Imported artwork is usually photographic or a
  // gradient illustration, which PNG stores appallingly — a 1200x630 illustration
  // came out at 1.4 MB, on a page every reader pays for. The same image as WebP is
  // an order of magnitude smaller with no visible difference at cover size.
  const image = await normaliseToCoverWebp(bytes, MAX_IMAGE_PIXELS);

  return { image, sourceBytes: total, sourceType: sniffed.mime };
}
