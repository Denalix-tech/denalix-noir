"use server";

import sharp from "sharp";

import { loadAdminContext } from "./authz";
import {
  MAX_IMAGE_BYTES as MAX_BYTES,
  MAX_IMAGE_PIXELS,
  sniffImageType,
} from "./image-type";

/**
 * Cover image upload.
 *
 * The client-declared MIME type is treated as a hint only — the real type is
 * sniffed from the file's leading bytes, so renaming `payload.svg` to
 * `photo.png` does not get it into the bucket.
 *
 * Uploads used to be validated and then stored as received, so a 4 MB phone photo
 * passed the check and cost every reader 4 MB thereafter. They are now re-encoded
 * to a 1200x630 WebP: right-sized for the slot it fills, an order of magnitude
 * smaller, and stripped of whatever metadata or trailing payload the original
 * carried. The 5 MB cap still applies to the *input*, so a huge file cannot be
 * used to chew server memory before sharp ever sees it.
 */

/** Matches the cover slot the blog renders, and the MCP server's output. */
const COVER_WIDTH = 1200;
const COVER_HEIGHT = 630;

export type UploadState = {
  url?: string;
  error?: string;
};

/** Public bucket created by the blog migration. */
const BUCKET = "blog-images";

export async function uploadCoverImageAction(
  _prevState: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const context = await loadAdminContext();
  if (!context.ok) {
    return { error: "You are not signed in as an administrator." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  if (file.size > MAX_BYTES) {
    return { error: "Images must be 5 MB or smaller." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageType(bytes);

  if (!sniffed) {
    return { error: "Only JPEG, PNG, and WebP images are accepted." };
  }

  // Re-encoded after sniffing, never before: the type check must run on the bytes
  // as received, not on whatever sharp decided to make of them.
  let optimized: Buffer;
  try {
    optimized = await sharp(bytes, { limitInputPixels: MAX_IMAGE_PIXELS })
      .resize(COVER_WIDTH, COVER_HEIGHT, { fit: "cover", position: "centre" })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();
  } catch (error) {
    console.error("[admin] cover re-encode failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { error: "That image could not be processed. Try a different file." };
  }

  // Collision-resistant, admin-owned path. The user id prefix keeps uploads
  // attributable and makes per-user storage policies possible later.
  const path = `${context.user.id}/${crypto.randomUUID()}.webp`;

  const { error } = await context.supabase.storage.from(BUCKET).upload(path, optimized, {
    contentType: "image/webp",
    upsert: false,
  });

  if (error) {
    console.error("[admin] cover upload failed", { path, message: error.message });
    return { error: "Upload failed. Please try again." };
  }

  const {
    data: { publicUrl },
  } = context.supabase.storage.from(BUCKET).getPublicUrl(path);

  return { url: publicUrl };
}
