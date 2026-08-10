import Image from "next/image";

import { MarkdownContent } from "./MarkdownContent";
import { formatPostDate } from "@/lib/blog/format";
import { formatReadingTime } from "@/lib/blog/reading-time";

export type ArticlePost = {
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  published_at: string | null;
  authorDisplayName?: string | null;
};

/**
 * The single presentation component for a post body.
 *
 * Both the public page and the admin draft preview render through this, so a
 * preview cannot drift away from what visitors eventually see.
 */
export function PostArticle({ post }: { post: ArticlePost }) {
  const publishedLabel = formatPostDate(post.published_at);

  return (
    <article className="container-px mx-auto max-w-3xl">
      <header>
        <h1 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
          {post.title}
        </h1>

        <p className="mt-5 text-lg leading-relaxed text-muted">{post.excerpt}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-soft">
          {post.authorDisplayName ? (
            <>
              <span className="text-muted">{post.authorDisplayName}</span>
              <span aria-hidden="true">·</span>
            </>
          ) : null}

          {publishedLabel ? (
            <>
              <time dateTime={post.published_at ?? undefined}>{publishedLabel}</time>
              <span aria-hidden="true">·</span>
            </>
          ) : null}

          <span>{formatReadingTime(post.content)}</span>
        </div>
      </header>

      {post.cover_image_url ? (
        <div className="relative mt-10 aspect-[16/9] w-full overflow-hidden rounded-sm border border-white/10">
          <Image
            src={post.cover_image_url}
            alt={post.cover_image_alt ?? ""}
            fill
            priority
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="mt-12">
        <MarkdownContent content={post.content} />
      </div>
    </article>
  );
}
