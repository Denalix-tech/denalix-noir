"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { CoverImageField } from "./CoverImageField";
import { MarkdownContent } from "@/components/blog/MarkdownContent";
import { createPostAction, updatePostAction, type PostFormState } from "@/lib/blog/actions";
import { EXCERPT_MAX, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, TITLE_MAX } from "@/lib/blog/schema";
import { slugify } from "@/lib/blog/slug";
import type { PostRow } from "@/lib/supabase/database.types";

const INITIAL: PostFormState = {};

const INPUT_CLASS =
  "mt-2 w-full rounded-sm border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-white/50";

type Props = {
  /** Absent for a new post. */
  post?: PostRow;
  /** Shown after a redirect from a successful create. */
  justSaved?: boolean;
};

export function PostEditor({ post, justSaved = false }: Props) {
  const isEdit = Boolean(post);

  const [state, formAction, pending] = useActionState(
    isEdit ? updatePostAction : createPostAction,
    INITIAL,
  );

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [coverUrl, setCoverUrl] = useState(post?.cover_image_url ?? "");
  const [coverAlt, setCoverAlt] = useState(post?.cover_image_alt ?? "");
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(post?.seo_description ?? "");

  // Once a slug has been hand-edited (or the post already exists), a title
  // change must never silently rewrite it — that would break live URLs.
  const [slugLocked, setSlugLocked] = useState(isEdit);

  const [showPreview, setShowPreview] = useState(false);

  const initial = useMemo(
    () => ({
      title: post?.title ?? "",
      slug: post?.slug ?? "",
      excerpt: post?.excerpt ?? "",
      content: post?.content ?? "",
      coverUrl: post?.cover_image_url ?? "",
      coverAlt: post?.cover_image_alt ?? "",
      seoTitle: post?.seo_title ?? "",
      seoDescription: post?.seo_description ?? "",
    }),
    [post],
  );

  const dirty =
    title !== initial.title ||
    slug !== initial.slug ||
    excerpt !== initial.excerpt ||
    content !== initial.content ||
    coverUrl !== initial.coverUrl ||
    coverAlt !== initial.coverAlt ||
    seoTitle !== initial.seoTitle ||
    seoDescription !== initial.seoDescription;

  // Warn before losing unsaved edits. Cleared while a save is in flight so a
  // successful submit does not trigger the prompt.
  useEffect(() => {
    if (!dirty || pending) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, pending]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugLocked) setSlug(slugify(value));
  }

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      {post ? <input type="hidden" name="postId" value={post.id} /> : null}

      {/* ---------------------------------------------------------------- */}
      {/* Main column                                                       */}
      {/* ---------------------------------------------------------------- */}
      <div className="space-y-6">
        <div aria-live="polite">
          {state.formError ? (
            <p
              role="alert"
              className="rounded-sm border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {state.formError}
            </p>
          ) : null}

          {state.success || justSaved ? (
            <p className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {state.success ?? "Post created."}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-white">
            Title
          </label>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            maxLength={TITLE_MAX}
            required
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? "title-error" : undefined}
            className={INPUT_CLASS}
          />
          {errors.title ? (
            <p id="title-error" className="mt-2 text-sm text-red-300">
              {errors.title}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-white">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugLocked(true);
              setSlug(event.target.value);
            }}
            required
            aria-invalid={errors.slug ? true : undefined}
            aria-describedby={errors.slug ? "slug-error" : "slug-hint"}
            className={`${INPUT_CLASS} font-mono`}
          />
          <p id="slug-hint" className="mt-2 text-xs text-muted-soft">
            /blog/{slug || "your-post"} — lowercase letters, numbers, and hyphens.
            {isEdit ? " Changing this breaks the existing URL." : null}
          </p>
          {errors.slug ? (
            <p id="slug-error" className="mt-2 text-sm text-red-300">
              {errors.slug}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="excerpt" className="block text-sm font-medium text-white">
              Excerpt
            </label>
            <span className="text-xs tabular-nums text-muted-soft">
              {excerpt.length}/{EXCERPT_MAX}
            </span>
          </div>
          <textarea
            id="excerpt"
            name="excerpt"
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
            maxLength={EXCERPT_MAX}
            rows={3}
            required
            aria-invalid={errors.excerpt ? true : undefined}
            aria-describedby={errors.excerpt ? "excerpt-error" : undefined}
            className={INPUT_CLASS}
          />
          {errors.excerpt ? (
            <p id="excerpt-error" className="mt-2 text-sm text-red-300">
              {errors.excerpt}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="content" className="block text-sm font-medium text-white">
              Content (Markdown)
            </label>
            <button
              type="button"
              onClick={() => setShowPreview((value) => !value)}
              aria-pressed={showPreview}
              className="text-xs font-medium text-muted underline underline-offset-4 hover:text-white"
            >
              {showPreview ? "Hide preview" : "Show preview"}
            </button>
          </div>

          <div className={showPreview ? "grid grid-cols-1 gap-4 xl:grid-cols-2" : ""}>
            <textarea
              id="content"
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={22}
              required
              aria-invalid={errors.content ? true : undefined}
              aria-describedby={errors.content ? "content-error" : undefined}
              className={`${INPUT_CLASS} font-mono leading-relaxed`}
            />

            {showPreview ? (
              <div className="mt-2 max-h-[36rem] overflow-y-auto rounded-sm border border-white/10 bg-white/[0.02] p-5">
                {content.trim() ? (
                  <MarkdownContent content={content} />
                ) : (
                  <p className="text-sm text-muted-soft">Nothing to preview yet.</p>
                )}
              </div>
            ) : null}
          </div>

          {errors.content ? (
            <p id="content-error" className="mt-2 text-sm text-red-300">
              {errors.content}
            </p>
          ) : null}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Sidebar                                                           */}
      {/* ---------------------------------------------------------------- */}
      <aside className="space-y-8">
        <div className="panel rounded-sm p-5">
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              name="intent"
              value="draft"
              disabled={pending}
              className="flex-1 rounded-sm border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save draft"}
            </button>
            <button
              type="submit"
              name="intent"
              value="publish"
              disabled={pending}
              className="flex-1 rounded-sm bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {post?.status === "published" ? "Update" : "Publish"}
            </button>
          </div>

          <p className="mt-3 text-xs text-muted-soft">
            {dirty ? "You have unsaved changes." : "All changes saved."}
          </p>

          {post ? (
            <div className="mt-4 flex flex-wrap gap-4 border-t border-white/10 pt-4 text-sm">
              <Link
                href={`/admin/posts/${post.id}/preview`}
                className="font-medium text-muted underline underline-offset-4 hover:text-white"
              >
                Preview
              </Link>
              <Link
                href="/admin/posts"
                className="font-medium text-muted underline underline-offset-4 hover:text-white"
              >
                Back to posts
              </Link>
            </div>
          ) : null}
        </div>

        <CoverImageField
          url={coverUrl}
          alt={coverAlt}
          onUrlChange={setCoverUrl}
          onAltChange={setCoverAlt}
          altError={errors.coverImageAlt}
        />

        <fieldset className="space-y-5">
          <legend className="text-sm font-medium text-white">Search engine metadata</legend>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="seoTitle" className="block text-sm font-medium text-white">
                SEO title
              </label>
              <span className="text-xs tabular-nums text-muted-soft">
                {seoTitle.length}/{SEO_TITLE_MAX}
              </span>
            </div>
            <input
              id="seoTitle"
              name="seoTitle"
              value={seoTitle}
              onChange={(event) => setSeoTitle(event.target.value)}
              maxLength={SEO_TITLE_MAX}
              aria-invalid={errors.seoTitle ? true : undefined}
              aria-describedby={errors.seoTitle ? "seoTitle-error" : "seoTitle-hint"}
              className={INPUT_CLASS}
            />
            <p id="seoTitle-hint" className="mt-2 text-xs text-muted-soft">
              Falls back to the post title when empty.
            </p>
            {errors.seoTitle ? (
              <p id="seoTitle-error" className="mt-2 text-sm text-red-300">
                {errors.seoTitle}
              </p>
            ) : null}
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="seoDescription" className="block text-sm font-medium text-white">
                SEO description
              </label>
              <span className="text-xs tabular-nums text-muted-soft">
                {seoDescription.length}/{SEO_DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="seoDescription"
              name="seoDescription"
              value={seoDescription}
              onChange={(event) => setSeoDescription(event.target.value)}
              maxLength={SEO_DESCRIPTION_MAX}
              rows={3}
              aria-invalid={errors.seoDescription ? true : undefined}
              aria-describedby={errors.seoDescription ? "seoDescription-error" : "seoDescription-hint"}
              className={INPUT_CLASS}
            />
            <p id="seoDescription-hint" className="mt-2 text-xs text-muted-soft">
              Falls back to the excerpt when empty.
            </p>
            {errors.seoDescription ? (
              <p id="seoDescription-error" className="mt-2 text-sm text-red-300">
                {errors.seoDescription}
              </p>
            ) : null}
          </div>
        </fieldset>
      </aside>
    </form>
  );
}
