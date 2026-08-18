import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../src/lib/supabase/database.types";
import type { PostInput } from "../../src/lib/blog/schema";
import { credentialsFor, type SiteConfig } from "../sites";

/**
 * All Supabase access for the blog MCP server, scoped to one site per call.
 *
 * Every site this serves is Next.js + Supabase, so there is deliberately no
 * `BlogAdapter` interface and no dispatch table: one implementation behind an
 * interface is ceremony, not abstraction. The seam is this module's boundary —
 * if a site ever arrives on a different backend, the interface gets extracted
 * from two real implementations instead of one imagined one. See
 * `docs/features/MULTI_SITE_PLAN.md` D3.
 *
 * These clients use each site's **service-role key** and bypass RLS. The server
 * runs locally over stdio, launched by an editor. It must never be deployed or
 * exposed on a port.
 */

const BUCKET = "blog-images";

export type PostSummary = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  updated_at: string;
};

export function clientFor(site: SiteConfig): SupabaseClient<Database> {
  const { url, serviceKey } = credentialsFor(site);
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Posts must be attributed to a real account; use the site's owner. */
async function ownerId(site: SiteConfig, client: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await client
    .from("profiles")
    .select("id")
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Could not read owner profile: ${error.message}`);
  if (!data) {
    throw new Error(
      `No owner profile found for "${site.key}". Grant an owner role first — see README.md.`,
    );
  }
  return data.id;
}

export async function listPosts(
  site: SiteConfig,
  status: "draft" | "published" | "all" = "all",
): Promise<PostSummary[]> {
  const client = clientFor(site);
  let query = client
    .from("posts")
    .select("id, title, slug, status, published_at, updated_at")
    .order("updated_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(`Could not list posts: ${error.message}`);
  return data ?? [];
}

/** A published post, with enough text to match a draft against. */
export type LinkablePost = {
  slug: string;
  title: string;
  excerpt: string;
};

/**
 * Published posts a draft could link to.
 *
 * Drafts are excluded on purpose: linking to a URL that currently 404s would ship
 * a broken link the moment the post goes live, and the target may never be
 * published at all.
 */
export async function listLinkablePosts(site: SiteConfig): Promise<LinkablePost[]> {
  const client = clientFor(site);
  const { data, error } = await client
    .from("posts")
    .select("slug, title, excerpt")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(`Could not list linkable posts: ${error.message}`);
  return data ?? [];
}

export async function checkSlug(
  site: SiteConfig,
  slug: string,
): Promise<{ taken: boolean; takenBy: string | null }> {
  const client = clientFor(site);
  const { data, error } = await client
    .from("posts")
    .select("id, title")
    .eq("slug", slug)
    .limit(1);

  if (error) throw new Error(`Could not check slug: ${error.message}`);

  const rows = data ?? [];
  return { taken: rows.length > 0, takenBy: rows.length > 0 ? rows[0].title : null };
}

/**
 * Creates a post as a draft. There is no `status` parameter and no publish
 * function in this module by design — publishing stays a human action in each
 * site's own admin.
 */
export async function createDraft(
  site: SiteConfig,
  input: PostInput,
): Promise<{ id: string; slug: string; reviewUrl: string }> {
  const client = clientFor(site);

  const { taken } = await checkSlug(site, input.slug);
  if (taken) {
    throw new Error(`Slug "${input.slug}" is already taken on ${site.name}. Pick another and retry.`);
  }

  const { data, error } = await client
    .from("posts")
    .insert({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      content: input.content,
      cover_image_url: input.coverImageUrl,
      cover_image_alt: input.coverImageAlt,
      seo_title: input.seoTitle,
      seo_description: input.seoDescription,
      author_id: await ownerId(site, client),
      // Not configurable on purpose — this server never publishes.
      status: "draft",
      published_at: null,
      source: "ai-assisted",
    })
    .select("id, slug")
    .single();

  if (error || !data) {
    throw new Error(`Insert failed: ${error?.message ?? "unknown error"}`);
  }

  return {
    id: data.id,
    slug: data.slug,
    reviewUrl: `${site.adminOrigin}/admin/posts/${data.id}/edit`,
  };
}

export async function uploadCover(
  site: SiteConfig,
  image: Buffer,
  slug: string,
  /** Encoding chosen by the caller — WebP for photographs, PNG only where it wins. */
  encoding: { ext: "webp" | "png"; contentType: "image/webp" | "image/png" } = {
    ext: "webp",
    contentType: "image/webp",
  },
): Promise<{ url: string }> {
  const client = clientFor(site);
  const path = `covers/${slug}-${Date.now().toString(36)}.${encoding.ext}`;

  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, image, { contentType: encoding.contentType, upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = client.storage.from(BUCKET).getPublicUrl(path);

  return { url: publicUrl };
}
