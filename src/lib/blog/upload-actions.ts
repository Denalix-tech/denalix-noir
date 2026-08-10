"use server";

import { loadAdminContext } from "./authz";

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

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB, mirrored by the bucket config

const BUCKET = "blog-images";

type SniffedType = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

function sniffImageType(bytes: Uint8Array): SniffedType | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && PNG.every((byte, i) => bytes[i] === byte)) {
    return { mime: "image/png", ext: "png" };
  }

  // WebP: "RIFF" .... "WEBP"
  if (bytes.length >= 12) {
    const riff = String.fromCharCode(...bytes.subarray(0, 4));
    const webp = String.fromCharCode(...bytes.subarray(8, 12));
    if (riff === "RIFF" && webp === "WEBP") {
      return { mime: "image/webp", ext: "webp" };
    }
  }

  return null;
}

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
