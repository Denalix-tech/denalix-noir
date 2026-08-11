"use server";

import { loadAdminContext } from "./authz";
import { MAX_IMAGE_BYTES as MAX_BYTES, sniffImageType } from "./image-type";

/**
 * Cover image upload.
 *
 * The client-declared MIME type is treated as a hint only — the real type is
 * sniffed from the file's leading bytes, so renaming `payload.svg` to
 * `photo.png` does not get it into the bucket.
 */

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

  // Collision-resistant, admin-owned path. The user id prefix keeps uploads
  // attributable and makes per-user storage policies possible later.
  const path = `${context.user.id}/${crypto.randomUUID()}.${sniffed.ext}`;

  const { error } = await context.supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: sniffed.mime,
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
