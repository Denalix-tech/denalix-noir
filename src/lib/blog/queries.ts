import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, PostRow } from "@/lib/supabase/database.types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Blog reads.
 *
 * Public queries deliberately restate the published/not-future conditions that
 * RLS already enforces. The duplication is intentional: the policy is the
 * security boundary, and these predicates keep the intent legible at the call
 * site and let the partial index be used.
 */

/** Columns needed for a listing card; avoids shipping full post bodies. */
const LIST_COLUMNS =
  "id, title, slug, excerpt, cover_image_url, cover_image_alt, published_at, content";

export type PostListItem = Pick<
  PostRow,
  | "id"
  | "title"
  | "slug"
  | "excerpt"
  | "cover_image_url"
  | "cover_image_alt"
  | "published_at"
  | "content"
>;

export type PostWithAuthor = PostRow & { authorDisplayName: string | null };

export type ListOptions = {
  /** Page size. Structured for pagination even though v1 shows a single page. */
  limit?: number;
  offset?: number;
};

/**
 * Published posts, newest first. Returns an empty list when Supabase is not
 * configured so the marketing build never fails on a missing env var.
 */
export async function listPublishedPosts(options: ListOptions = {}): Promise<PostListItem[]> {
  if (!isSupabaseConfigured()) return [];

  const { limit = 50, offset = 0 } = options;
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("posts")
    .select(LIST_COLUMNS)
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[blog] listPublishedPosts failed", { message: error.message });
    return [];
  }

  return (data ?? []) as PostListItem[];
}

/**
 * How many posts are publicly visible right now.
 *
 * `head: true` asks Postgres for the count without transferring any rows, so
 * paginating does not mean fetching the whole archive to learn its size.
 */
export async function countPublishedPosts(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const supabase = createPublicClient();

  const { count, error } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString());

  if (error) {
    console.error("[blog] countPublishedPosts failed", { message: error.message });
    return 0;
  }

  return count ?? 0;
}

/**
 * The current slug for a post that used to live at `oldSlug`, or null.
 *
 * Only consulted after a lookup has already missed, so the happy path costs
 * nothing. The target is re-checked for publication: a post that was renamed and
 * then unpublished must 404 like any other draft rather than redirect to one.
 */
export async function resolveRenamedSlug(oldSlug: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("post_slug_history")
    .select("post_id")
    .eq("old_slug", oldSlug)
    .maybeSingle();

  if (error || !data) return null;

  const { data: post } = await supabase
    .from("posts")
    .select("slug")
    .eq("id", data.post_id)
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  return post?.slug ?? null;
}

/** A single publicly visible post, or null for missing/draft/future content. */
export async function getPublishedPostBySlug(slug: string): Promise<PostWithAuthor | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error("[blog] getPublishedPostBySlug failed", { slug, message: error.message });
    return null;
  }
  if (!data) return null;

  return { ...(data as PostRow), authorDisplayName: await lookupAuthorName(supabase, data.author_id) };
}

/** Slugs of publicly visible posts, for sitemap generation. */
export async function listPublishedSlugs(): Promise<{ slug: string; published_at: string | null }[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("posts")
    .select("slug, published_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[blog] listPublishedSlugs failed", { message: error.message });
    return [];
  }

  return data ?? [];
}

/**
 * Every post, drafts included, most recently updated first. Requires a client
 * carrying an admin session; RLS returns only published rows otherwise.
 */
export async function listAllPosts(supabase: SupabaseClient<Database>): Promise<PostRow[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[admin] listAllPosts failed", { message: error.message });
    throw new Error("Could not load posts.");
  }

  return data ?? [];
}

/** A single post by id for the admin editor and draft preview. */
export async function getPostById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<PostWithAuthor | null> {
  const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("[admin] getPostById failed", { id, message: error.message });
    return null;
  }
  if (!data) return null;

  return { ...data, authorDisplayName: await lookupAuthorName(supabase, data.author_id) };
}

/** True when another post already owns this slug. */
export async function slugExists(
  supabase: SupabaseClient<Database>,
  slug: string,
  excludePostId?: string,
): Promise<boolean> {
  let query = supabase.from("posts").select("id").eq("slug", slug).limit(1);
  if (excludePostId) query = query.neq("id", excludePostId);

  const { data, error } = await query;

  if (error) {
    console.error("[admin] slugExists failed", { slug, message: error.message });
    // Fail closed: treat an unknown result as taken rather than risk a
    // confusing unique-violation crash later.
    return true;
  }

  return (data ?? []).length > 0;
}

async function lookupAuthorName(
  supabase: SupabaseClient<Database>,
  authorId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("post_authors")
    .select("display_name")
    .eq("id", authorId)
    .maybeSingle<{ display_name: string | null }>();

  if (error) {
    // Attribution is non-essential; never fail a page render over it.
    console.error("[blog] author lookup failed", { authorId, message: error.message });
    return null;
  }

  return data?.display_name ?? null;
}
