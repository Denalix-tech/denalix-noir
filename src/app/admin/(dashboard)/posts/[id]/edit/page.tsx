import Link from "next/link";
import { notFound } from "next/navigation";

import { PostEditor } from "@/components/admin/PostEditor";
import { loadAdminContext } from "@/lib/blog/authz";
import { getPostById } from "@/lib/blog/queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function EditPostPage({ params, searchParams }: PageProps) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);

  const context = await loadAdminContext();
  if (!context.ok) return null;

  const post = await getPostById(context.supabase, id);
  if (!post) notFound();

  return (
    <>
      <div className="mb-8">
        <Link
          href="/admin/posts"
          className="text-sm font-medium text-muted underline underline-offset-4 hover:text-white"
        >
          Back to posts
        </Link>
        <h1 className="font-display mt-3 text-2xl font-semibold text-white">Edit post</h1>
      </div>

      <PostEditor post={post} justSaved={saved === "1"} />
    </>
  );
}
