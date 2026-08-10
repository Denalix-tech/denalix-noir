"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CircleDot, FileText, PenLine } from "lucide-react";

import { DeletePostDialog } from "./DeletePostDialog";
import { SubmitButton } from "./SubmitButton";
import {
  publishSelectedAction,
  setPostStatusAction,
  type BulkPublishResult,
} from "@/lib/blog/actions";
import { formatAdminDateTime } from "@/lib/blog/format";
import type { PostRow } from "@/lib/supabase/database.types";

function StatusBadge({ status }: { status: PostRow["status"] }) {
  const published = status === "published";

  // Icon + text carry the meaning; color is only reinforcement.
  const Icon = published ? CircleDot : FileText;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs font-medium ${
        published
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : "border-white/20 bg-white/5 text-muted"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {published ? "Published" : "Draft"}
    </span>
  );
}

/** Editorial provenance. Shown only for AI-assisted drafts. */
function SourceBadge({ source }: { source: PostRow["source"] }) {
  if (source !== "ai-assisted") return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-100"
      title="Drafted with AI assistance — review before publishing"
    >
      <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
      AI-assisted
    </span>
  );
}

export function PostList({ posts }: { posts: PostRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BulkPublishResult | null>(null);
  const [pending, startTransition] = useTransition();

  const drafts = posts.filter((post) => post.status === "draft");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function approveSelected() {
    const payload = new FormData();
    for (const id of selected) payload.append("postId", id);

    startTransition(async () => {
      const outcome = await publishSelectedAction(payload);
      setResult(outcome);
      setSelected(new Set());
    });
  }

  if (posts.length === 0) {
    return (
      <div className="panel mt-8 rounded-sm p-10 text-center">
        <h2 className="font-display text-lg font-semibold text-white">No posts yet</h2>
        <p className="mt-3 text-sm text-muted">
          Create your first post to get the blog started.
        </p>
        <Link
          href="/admin/posts/new"
          className="mt-6 inline-block rounded-sm bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
        >
          New post
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Approval bar — only meaningful while drafts exist. */}
      {drafts.length > 0 ? (
        <div className="panel mt-8 flex flex-wrap items-center justify-between gap-4 rounded-sm p-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                className="h-4 w-4 accent-white"
                checked={selected.size === drafts.length && drafts.length > 0}
                onChange={(event) =>
                  setSelected(
                    event.target.checked ? new Set(drafts.map((d) => d.id)) : new Set(),
                  )
                }
              />
              Select all drafts ({drafts.length})
            </label>

            <span className="text-sm text-muted-soft">{selected.size} selected</span>
          </div>

          <button
            type="button"
            onClick={approveSelected}
            disabled={pending || selected.size === 0}
            className="rounded-sm bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Publishing…" : `Approve & publish (${selected.size})`}
          </button>
        </div>
      ) : null}

      <div aria-live="polite">
        {result ? (
          <div
            className={`mt-4 rounded-sm border px-4 py-3 text-sm ${
              result.error || result.skipped.length > 0
                ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {result.error ? (
              result.error
            ) : (
              <>
                Published {result.published}.
                {result.skipped.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {result.skipped.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      <ul className="mt-4 space-y-3">
        {posts.map((post) => (
          <li key={post.id} className="panel rounded-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 gap-4">
                {post.status === "draft" ? (
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-white"
                    checked={selected.has(post.id)}
                    onChange={() => toggle(post.id)}
                    aria-label={`Select draft: ${post.title}`}
                  />
                ) : (
                  <span className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                )}

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-base font-semibold text-white">
                      {post.title}
                    </h2>
                    <StatusBadge status={post.status} />
                    <SourceBadge source={post.source} />
                  </div>

                  <p className="mt-1.5 truncate font-mono text-xs text-muted-soft">
                    /blog/{post.slug}
                  </p>

                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-soft">
                    <div className="flex gap-1.5">
                      <dt>Published:</dt>
                      <dd>{formatAdminDateTime(post.published_at)}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt>Updated:</dt>
                      <dd>{formatAdminDateTime(post.updated_at)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={`/admin/posts/${post.id}/edit`}
                  className="text-sm font-medium text-white underline underline-offset-4 hover:text-white/80"
                >
                  Edit
                </Link>

                <Link
                  href={`/admin/posts/${post.id}/preview`}
                  className="text-sm font-medium text-muted underline underline-offset-4 hover:text-white"
                >
                  Preview
                </Link>

                <form action={setPostStatusAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={post.status === "published" ? "draft" : "published"}
                  />
                  <SubmitButton
                    pendingLabel="Working…"
                    className="text-sm font-medium text-muted underline underline-offset-4 hover:text-white"
                  >
                    {post.status === "published" ? "Unpublish" : "Publish"}
                  </SubmitButton>
                </form>

                <DeletePostDialog postId={post.id} title={post.title} slug={post.slug} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
