import Link from "next/link";

import { PostEditor } from "@/components/admin/PostEditor";

export const dynamic = "force-dynamic";

export default function NewPostPage() {
  return (
    <>
      <div className="mb-8">
        <Link
          href="/admin/posts"
          className="text-sm font-medium text-muted underline underline-offset-4 hover:text-white"
        >
          Back to posts
        </Link>
        <h1 className="font-display mt-3 text-2xl font-semibold text-white">New post</h1>
      </div>

      <PostEditor />
    </>
  );
}
