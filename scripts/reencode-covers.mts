/**
 * Re-encodes cover images already stored in Supabase to right-sized WebP.
 *
 *   npx tsx scripts/reencode-covers.mts            # report only
 *   npx tsx scripts/reencode-covers.mts --apply    # rewrite them
 *
 * The upload and generation paths now emit WebP, but that fix cannot reach images
 * already published — one live cover is 1.4 MB, which every reader of that page
 * pays for. This walks the existing posts and rewrites anything oversized.
 *
 * The original object is left in place rather than deleted. Storage is cheap, a
 * mis-encoded cover is not, and a post that still references the old URL keeps
 * working until its row is updated. Clean up under Storage once you are happy.
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY, so run it locally.
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import { env } from "../mcp/lib";
import type { Database } from "../src/lib/supabase/database.types";

const BUCKET = "blog-images";
const COVER_WIDTH = 1200;
const COVER_HEIGHT = 630;

/** Anything already smaller than this is not worth rewriting. */
const REWRITE_ABOVE_BYTES = 150 * 1024;

const apply = process.argv.includes("--apply");

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.");
  process.exit(2);
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Turns a public storage URL back into the object path inside the bucket. */
function objectPath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const at = publicUrl.indexOf(marker);
  return at === -1 ? null : decodeURIComponent(publicUrl.slice(at + marker.length));
}

const { data: posts, error } = await admin
  .from("posts")
  .select("id, slug, status, cover_image_url")
  .not("cover_image_url", "is", null);

if (error) {
  console.error(`Could not list posts: ${error.message}`);
  process.exit(1);
}

console.log(`${apply ? "Rewriting" : "Checking"} ${posts?.length ?? 0} post cover(s)\n`);

let savedTotal = 0;
let rewritten = 0;

for (const post of posts ?? []) {
  const current = post.cover_image_url!;
  const path = objectPath(current);

  if (!path) {
    console.log(`  skip   ${post.slug} — cover is not in this bucket (${current.slice(0, 60)}…)`);
    continue;
  }

  const { data: blob, error: downloadError } = await admin.storage.from(BUCKET).download(path);
  if (downloadError || !blob) {
    console.log(`  ERROR  ${post.slug} — could not download: ${downloadError?.message}`);
    continue;
  }

  const original = Buffer.from(await blob.arrayBuffer());

  if (original.length <= REWRITE_ABOVE_BYTES) {
    console.log(`  ok     ${post.slug} — ${(original.length / 1024).toFixed(0)} KB, already small`);
    continue;
  }

  const optimized = await sharp(original)
    .resize(COVER_WIDTH, COVER_HEIGHT, { fit: "cover", position: "centre" })
    .webp({ quality: 82, effort: 5 })
    .toBuffer();

  const saved = original.length - optimized.length;
  const pct = Math.round((saved / original.length) * 100);
  savedTotal += saved;

  console.log(
    `  ${apply ? "REWRITE" : "would "} ${post.slug} — ${(original.length / 1024).toFixed(0)} KB → ${(optimized.length / 1024).toFixed(0)} KB (${pct}% smaller)`,
  );

  if (!apply) continue;

  // New object rather than an overwrite: a CDN may still be serving the old URL,
  // and replacing bytes under a live path invites a half-cached mess.
  const newPath = `covers/${post.slug}-reencoded-${Date.now().toString(36)}.webp`;

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(newPath, optimized, { contentType: "image/webp", upsert: false });

  if (uploadError) {
    console.log(`  ERROR  ${post.slug} — upload failed: ${uploadError.message}`);
    continue;
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(newPath);

  const { error: updateError } = await admin
    .from("posts")
    .update({ cover_image_url: publicUrl })
    .eq("id", post.id);

  if (updateError) {
    console.log(`  ERROR  ${post.slug} — row update failed: ${updateError.message}`);
    continue;
  }

  rewritten++;
}

console.log(
  `\n${apply ? `Rewrote ${rewritten} cover(s).` : "Nothing changed."} ` +
    `${(savedTotal / 1024).toFixed(0)} KB ${apply ? "saved" : "would be saved"}.`,
);

if (!apply && savedTotal > 0) {
  console.log("Re-run with --apply to rewrite them.");
}
if (apply && rewritten > 0) {
  console.log("The previous objects are still in Storage; remove them once you are happy.");
}
