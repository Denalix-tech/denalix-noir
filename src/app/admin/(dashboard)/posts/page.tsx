import Link from "next/link";

import { PostList } from "@/components/admin/PostList";
import { listAllPosts } from "@/lib/blog/queries";
import { loadAdminContext } from "@/lib/blog/authz";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ deleted?: string }> };

export default async function AdminPostsPage({ searchParams }: PageProps) {
  const { deleted } = await searchParams;

  // The layout already guarded this route; re-checking keeps the page honest
  // on its own and gives us the authorized client.
  const context = await loadAdminContext();
  if (!context.ok) return null;

  const posts = await listAllPosts(context.supabase);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Posts</h1>
          <p className="mt-2 text-sm text-muted">
            {posts.length} {posts.length === 1 ? "post" : "posts"} · drafts are visible only here.
          </p>
        </div>

        <Link
          href="/admin/posts/new"
          className="rounded-sm bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
        >
          New post
        </Link>
      </div>

      {deleted ? (
        <p
          role="status"
          className="mt-6 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          Post deleted.
        </p>
      ) : null}

      <PostList posts={posts} />
    </>
  );
}
