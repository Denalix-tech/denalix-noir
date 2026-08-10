import Link from "next/link";
import { notFound } from "next/navigation";

import { PostArticle } from "@/components/blog/PostArticle";
import { loadAdminContext } from "@/lib/blog/authz";
import { getPostById } from "@/lib/blog/queries";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

/**
 * Draft preview.
 *
 * Reachable only by an authenticated administrator — the (dashboard) layout
 * guards it and RLS refuses to return drafts to anyone else. It renders the
 * same PostArticle component as the public page, so a preview cannot drift
 * from what visitors will eventually see.
 */
export default async function PreviewPostPage({ params }: PageProps) {
  const { id } = await params;

  const context = await loadAdminContext();
  if (!context.ok) return null;

  const post = await getPostById(context.supabase, id);
  if (!post) notFound();

  return (
    <>
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-3">
        <p className="text-sm text-amber-100">
          Preview of a {post.status === "published" ? "published" : "draft"} post. Only
          administrators can see this page.
        </p>
        <div className="flex gap-4 text-sm">
          <Link
            href={`/admin/posts/${post.id}/edit`}
            className="font-medium text-white underline underline-offset-4"
          >
            Edit
          </Link>
          <Link
            href="/admin/posts"
            className="font-medium text-amber-100 underline underline-offset-4"
          >
            Back to posts
          </Link>
        </div>
      </div>

      <PostArticle post={post} />
    </>
  );
}
