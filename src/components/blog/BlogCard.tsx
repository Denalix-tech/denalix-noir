import Image from "next/image";
import Link from "next/link";

import { formatPostDate } from "@/lib/blog/format";
import { formatReadingTime } from "@/lib/blog/reading-time";
import type { PostListItem } from "@/lib/blog/queries";

export function BlogCard({ post }: { post: PostListItem }) {
  const publishedLabel = formatPostDate(post.published_at);

  return (
    <article className="panel group h-full overflow-hidden rounded-sm transition-colors hover:border-white/40">
      <Link href={`/blog/${post.slug}`} className="flex h-full flex-col focus:outline-none">
        <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-white/10 bg-[#0a0a0a]">
          {post.cover_image_url ? (
            <Image
              src={post.cover_image_url}
              alt={post.cover_image_alt ?? ""}
              fill
              sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              aria-hidden="true"
              className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.10),transparent_60%)]"
            />
          )}
        </div>

        <div className="flex flex-1 flex-col p-6">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-soft">
            {publishedLabel ? (
              <>
                <time dateTime={post.published_at ?? undefined}>{publishedLabel}</time>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <span>{formatReadingTime(post.content)}</span>
          </div>

          <h2 className="font-display mt-3 text-lg font-semibold leading-snug text-white">
            <span className="underline-offset-4 group-hover:underline">{post.title}</span>
          </h2>

          <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">
            {post.excerpt}
          </p>

          <span className="mt-5 text-sm font-medium text-accent">Read article →</span>
        </div>
      </Link>
    </article>
  );
}
