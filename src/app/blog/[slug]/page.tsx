import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { CTASection } from "@/components/sections/CTASection";
import { PostArticle } from "@/components/blog/PostArticle";
import { getPublishedPostBySlug, resolveRenamedSlug } from "@/lib/blog/queries";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { blogPostingSchema, breadcrumbSchema } from "@/lib/schema";
import { pageOpenGraph, pageTwitter } from "@/lib/seo";

export const revalidate = 300;

// Next.js 16: params is a Promise and must be awaited.
type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    return { title: "Article not found — Denalix Tech", robots: { index: false, follow: false } };
  }

  const path = `/blog/${post.slug}`;
  const title = post.seo_title ?? post.title;
  const description = post.seo_description ?? post.excerpt;

  return {
    // Root layout appends "| Denalix Tech".
    title,
    description,
    // Relative — resolved against metadataBase, so it always points at the
    // canonical www origin.
    alternates: { canonical: path },
    openGraph: pageOpenGraph({
      type: "article",
      title: `${title} | Denalix Tech`,
      description,
      path,
      publishedTime: post.published_at ?? undefined,
      // Falls back to the site-wide OG image when a post has no cover.
      images: post.cover_image_url
        ? [{ url: post.cover_image_url, alt: post.cover_image_alt ?? title }]
        : undefined,
    }),
    twitter: pageTwitter({
      title: `${title} | Denalix Tech`,
      description,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    }),
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    // A miss might be a renamed post rather than a missing one. Checked only
    // after the primary lookup fails, so the normal path pays nothing, and a 308
    // rather than a 404 preserves the links and ranking the old URL earned.
    const current = await resolveRenamedSlug(slug);
    if (current && current !== slug) permanentRedirect(`/blog/${current}`);

    // Missing, draft, and future-dated posts are indistinguishable from here —
    // all three produce a real 404.
    notFound();
  }

  // The visible trail and the JSON-LD are built from one array, because
  // structured data that disagrees with what a visitor can see is a
  // rich-results violation rather than a bonus.
  const crumbs: BreadcrumbItem[] = [
    { name: "Home", path: "/" },
    { name: "Blogs", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ];

  return (
    <>
      <Navbar />

      <JsonLd
        data={blogPostingSchema({
          title: post.title,
          description: post.seo_description ?? post.excerpt,
          slug: post.slug,
          publishedAt: post.published_at,
          updatedAt: post.updated_at,
          imageUrl: post.cover_image_url,
          // Only the name actually rendered on the page; omitted when absent.
          authorName: post.authorDisplayName,
        })}
      />
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <main className="flex-1 pt-28 pb-8">
        <div className="container-px mx-auto max-w-3xl">
          <Breadcrumbs items={crumbs} />

          <Link
            href="/blog"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All articles
          </Link>
        </div>

        <div className="mt-8">
          <PostArticle post={post} />
        </div>
      </main>
      <CTASection />
      <Footer />
    </>
  );
}
