"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadAdminContext, type AdminContext, type AuthFailure } from "./authz";
import { getPostById, slugExists } from "./queries";
import { fieldErrors, formString, postInputSchema, type PostInput } from "./schema";

/**
 * All blog mutations.
 *
 * Every exported action independently re-authorizes. A Server Action is a
 * public endpoint — being reachable only from an admin page in the UI proves
 * nothing about who is calling it.
 */

export type PostFormState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

export type BulkPublishResult = {
  published: number;
  /** Human-readable reason per post that was not published. */
  skipped: string[];
  error?: string;
};

const AUTH_MESSAGES: Record<AuthFailure["reason"], string> = {
  unconfigured: "Supabase is not configured. See README.md.",
  unauthenticated: "Your session expired. Sign in again.",
  pending: "This account is awaiting approval by a superadmin.",
  forbidden: "This account does not have administrator access.",
};

function authError(failure: AuthFailure): PostFormState {
  return { formError: AUTH_MESSAGES[failure.reason] };
}

/**
 * Invalidates every public and admin route a mutation can affect. Slugs are
 * passed explicitly so a rename can clear the old URL as well as the new one.
 */
function revalidateBlog(...slugs: (string | null | undefined)[]): void {
  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  for (const slug of new Set(slugs.filter((s): s is string => Boolean(s)))) {
    revalidatePath(`/blog/${slug}`);
  }
}

function readPostForm(formData: FormData) {
  return postInputSchema.safeParse({
    title: formString(formData, "title"),
    slug: formString(formData, "slug"),
    excerpt: formString(formData, "excerpt"),
    content: formString(formData, "content"),
    coverImageUrl: formString(formData, "coverImageUrl"),
    coverImageAlt: formString(formData, "coverImageAlt"),
    seoTitle: formString(formData, "seoTitle"),
    seoDescription: formString(formData, "seoDescription"),
  });
}

function toRow(input: PostInput) {
  return {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    content: input.content,
    cover_image_url: input.coverImageUrl,
    cover_image_alt: input.coverImageAlt,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
  };
}

/** Publishing has stricter requirements than saving a draft. */
function publishBlockers(input: PostInput): Record<string, string> | null {
  const errors: Record<string, string> = {};
  if (!input.title) errors.title = "A title is required to publish.";
  if (!input.slug) errors.slug = "A slug is required to publish.";
  if (!input.excerpt) errors.excerpt = "An excerpt is required to publish.";
  if (!input.content) errors.content = "Content is required to publish.";
  if (input.coverImageUrl && !input.coverImageAlt) {
    errors.coverImageAlt = "Alt text is required when a cover image is set.";
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createPostAction(
  _prevState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const context = await loadAdminContext();
  if (!context.ok) return authError(context);

  const parsed = readPostForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const wantsPublish = formString(formData, "intent") === "publish";
  if (wantsPublish) {
    const blockers = publishBlockers(parsed.data);
    if (blockers) return { fieldErrors: blockers };
  }

  if (await slugExists(context.supabase, parsed.data.slug)) {
    return { fieldErrors: { slug: "That slug is already in use. Choose another." } };
  }

  const { data, error } = await context.supabase
    .from("posts")
    .insert({
      ...toRow(parsed.data),
      author_id: context.user.id,
      status: wantsPublish ? "published" : "draft",
      published_at: wantsPublish ? new Date().toISOString() : null,
    })
    .select("id, slug")
    .single();

  if (error || !data) {
    console.error("[admin] create post failed", { message: error?.message });
    return { formError: friendlyWriteError(error?.code) };
  }

  revalidateBlog(data.slug);
  // Outside any try/catch: redirect() signals by throwing.
  redirect(`/admin/posts/${data.id}/edit?saved=1`);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updatePostAction(
  _prevState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const context = await loadAdminContext();
  if (!context.ok) return authError(context);

  const postId = formString(formData, "postId");
  if (!postId) return { formError: "Missing post id." };

  const existing = await getPostById(context.supabase, postId);
  if (!existing) return { formError: "That post no longer exists." };

  const parsed = readPostForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const intent = formString(formData, "intent");
  const wantsPublish = intent === "publish";

  if (wantsPublish) {
    const blockers = publishBlockers(parsed.data);
    if (blockers) return { fieldErrors: blockers };
  }

  if (await slugExists(context.supabase, parsed.data.slug, postId)) {
    return { fieldErrors: { slug: "That slug is already in use. Choose another." } };
  }

  const status = wantsPublish ? "published" : existing.status;
  // First publish stamps published_at; later edits and re-publishes keep the
  // original timestamp.
  const publishedAt =
    status === "published" ? (existing.published_at ?? new Date().toISOString()) : existing.published_at;

  const { error } = await context.supabase
    .from("posts")
    .update({ ...toRow(parsed.data), status, published_at: publishedAt })
    .eq("id", postId);

  if (error) {
    console.error("[admin] update post failed", { postId, message: error.message });
    return { formError: friendlyWriteError(error.code) };
  }

  // Clear the old slug's route too when the slug changed.
  revalidateBlog(existing.slug, parsed.data.slug);

  return {
    success: wantsPublish ? "Post published." : "Draft saved.",
  };
}

// ---------------------------------------------------------------------------
// Publish / unpublish / delete
// ---------------------------------------------------------------------------

/**
 * Publish preconditions, shared by single and bulk publish.
 *
 * Bulk approval must not become a way to bypass a rule that single publish
 * enforces, so both paths call this. Returns a message, or null when the post
 * is safe to publish.
 */
function publishBlocker(post: {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
}): string | null {
  if (!post.title || !post.slug || !post.excerpt || !post.content.trim()) {
    return `"${post.title || post.slug}" is missing required fields.`;
  }
  if (post.cover_image_url && !post.cover_image_alt) {
    return `"${post.title}" has a cover image but no alt text.`;
  }
  return null;
}

export async function setPostStatusAction(formData: FormData): Promise<void> {
  const context = await loadAdminContext();
  if (!context.ok) throw new Error(AUTH_MESSAGES[context.reason]);

  const postId = formString(formData, "postId");
  const nextStatus = formString(formData, "status");
  if (nextStatus !== "draft" && nextStatus !== "published") {
    throw new Error("Invalid status.");
  }

  const existing = await requirePost(context, postId);

  if (nextStatus === "published") {
    const blocker = publishBlocker(existing);
    if (blocker) throw new Error(blocker);
  }

  const { error } = await context.supabase
    .from("posts")
    .update({
      status: nextStatus,
      // Unpublishing keeps the original publication timestamp.
      published_at:
        nextStatus === "published"
          ? (existing.published_at ?? new Date().toISOString())
          : existing.published_at,
    })
    .eq("id", postId);

  if (error) {
    console.error("[admin] status change failed", { postId, message: error.message });
    throw new Error("Could not update the post status.");
  }

  revalidateBlog(existing.slug);
}

/**
 * Approve and publish several drafts in one action.
 *
 * Every post is re-checked against `publishBlocker` individually — a bad post
 * in the selection is skipped and reported, not silently published, and it
 * does not block the rest. This is a convenience over the per-row button, not
 * a looser path: the reading is still the reviewer's job.
 */
export async function publishSelectedAction(formData: FormData): Promise<BulkPublishResult> {
  const context = await loadAdminContext();
  if (!context.ok) return { published: 0, skipped: [], error: AUTH_MESSAGES[context.reason] };

  const ids = formData
    .getAll("postId")
    .map((value) => String(value))
    .filter(Boolean);

  if (ids.length === 0) return { published: 0, skipped: [] };

  const skipped: string[] = [];
  const slugs: string[] = [];

  for (const id of ids) {
    const existing = await getPostById(context.supabase, id);
    if (!existing) {
      skipped.push("A selected post no longer exists.");
      continue;
    }

    const blocker = publishBlocker(existing);
    if (blocker) {
      skipped.push(blocker);
      continue;
    }

    const { error } = await context.supabase
      .from("posts")
      .update({
        status: "published",
        // First publish stamps the timestamp; a republish keeps the original.
        published_at: existing.published_at ?? new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[admin] bulk publish failed", { id, message: error.message });
      skipped.push(`"${existing.title}" could not be published.`);
      continue;
    }

    slugs.push(existing.slug);
  }

  revalidateBlog(...slugs);

  // Returned rather than thrown: Next redacts Server Action error messages in
  // production, which would hide exactly the detail the reviewer needs.
  return { published: slugs.length, skipped };
}

export async function deletePostAction(formData: FormData): Promise<void> {
  const context = await loadAdminContext();
  if (!context.ok) throw new Error(AUTH_MESSAGES[context.reason]);

  const postId = formString(formData, "postId");
  const existing = await requirePost(context, postId);

  // The confirmation field must echo the post's own slug, so a mis-aimed
  // delete cannot succeed by accident.
  if (formString(formData, "confirmSlug").trim() !== existing.slug) {
    throw new Error("Confirmation text did not match the post slug.");
  }

  const { error } = await context.supabase.from("posts").delete().eq("id", postId);

  if (error) {
    console.error("[admin] delete failed", { postId, message: error.message });
    throw new Error("Could not delete the post.");
  }

  // The cover image is intentionally left in storage; another post may use it.
  revalidateBlog(existing.slug);
  redirect("/admin/posts?deleted=1");
}

async function requirePost(context: AdminContext, postId: string) {
  if (!postId) throw new Error("Missing post id.");
  const existing = await getPostById(context.supabase, postId);
  if (!existing) throw new Error("That post no longer exists.");
  return existing;
}

/** Turns a Postgres error code into something safe to show a user. */
function friendlyWriteError(code: string | undefined): string {
  switch (code) {
    case "23505":
      return "That slug is already in use. Choose another.";
    case "23514":
      return "One of the fields failed a validation rule. Check lengths and the slug format.";
    case "42501":
      return "You do not have permission to perform that action.";
    default:
      return "Something went wrong saving the post. Please try again.";
  }
}
