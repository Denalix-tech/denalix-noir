import type { Metadata } from "next";

import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { CTASection } from "@/components/sections/CTASection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { BlogCard } from "@/components/blog/BlogCard";
import { countPublishedPosts, listPublishedPosts } from "@/lib/blog/queries";
import { pageOpenGraph, pageTwitter } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";

const TITLE = "AI Automation & Software Guides";
const DESCRIPTION =
  "Practical guides to AI automation, business workflows, dashboards, custom software, GIS, and the systems that help growing companies operate better.";

const PAGE_SIZE = 12;

type PageProps = { searchParams: Promise<{ page?: string }> };

/** Page 1 is always "/blog" — never "/blog?page=1", which would split signals. */
function pagePath(page: number): string {
  return page <= 1 ? "/blog" : `/blog?page=${page}`;
}

function readPage(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const page = readPage((await searchParams).page);
  // Later pages get their own canonical and a page number in the title, so they
  // are indexable in their own right rather than duplicates competing with the
  // first page.
  const title = page > 1 ? `${TITLE} — page ${page}` : TITLE;

  return {
    // Root layout appends "| Denalix Tech".
    title,
    description: DESCRIPTION,
    // Relative paths resolve against metadataBase, so the canonical always
    // lands on the production www origin regardless of where the build runs.
    alternates: { canonical: pagePath(page) },
    openGraph: pageOpenGraph({
      title: `${title} | Denalix Tech`,
      description: DESCRIPTION,
      path: pagePath(page),
    }),
    twitter: pageTwitter({ title: `${title} | Denalix Tech`, description: DESCRIPTION }),
  };
}

/**
 * Re-render at most every 5 minutes so a future-dated post becomes visible
 * without a manual revalidation. Mutations still invalidate this route
 * immediately via revalidatePath.
 */
export const revalidate = 300;

export default async function BlogIndexPage({ searchParams }: PageProps) {
  const page = readPage((await searchParams).page);

  const [posts, total] = await Promise.all([
    listPublishedPosts({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countPublishedPosts(),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // A page number past the end is a real 404 rather than an empty grid, so
  // crawlers do not index an unbounded series of blank pages.
  if (page > 1 && posts.length === 0) notFound();

  const crumbs: BreadcrumbItem[] = [
    { name: "Home", path: "/" },
    { name: "Blogs", path: "/blog" },
  ];

  return (
    <>
      <Navbar />
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <main className="flex-1 pt-28 pb-8">
        <section className="container-px mx-auto max-w-7xl">
          <Breadcrumbs items={crumbs} />

          <div className="mt-8">
          <SectionHeading
            as="h1"
            eyebrow="Blogs"
            title="Practical guides to AI automation and better business systems"
            description={DESCRIPTION}
            align="center"
            className="mx-auto"
          />
          </div>

          {posts.length === 0 ? (
            <div className="panel mx-auto mt-14 max-w-xl rounded-sm p-10 text-center">
              <h2 className="font-display text-lg font-semibold text-white">
                No articles published yet
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                We are writing the first guides now. Check back shortly, or get in touch if there is
                a topic you would find useful.
              </p>
            </div>
          ) : (
            <RevealGroup className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <RevealItem key={post.id} className="h-full">
                  <BlogCard post={post} />
                </RevealItem>
              ))}
            </RevealGroup>
          )}

          {lastPage > 1 ? (
            <nav
              aria-label="Blog pages"
              className="mt-14 flex items-center justify-center gap-6 text-sm"
            >
              {page > 1 ? (
                <Link
                  href={pagePath(page - 1)}
                  rel="prev"
                  className="font-medium text-muted transition-colors hover:text-white"
                >
                  ← Newer
                </Link>
              ) : (
                <span className="text-muted-soft">← Newer</span>
              )}

              <span className="font-mono text-xs text-muted-soft">
                Page {page} of {lastPage}
              </span>

              {page < lastPage ? (
                <Link
                  href={pagePath(page + 1)}
                  rel="next"
                  className="font-medium text-muted transition-colors hover:text-white"
                >
                  Older →
                </Link>
              ) : (
                <span className="text-muted-soft">Older →</span>
              )}
            </nav>
          ) : null}
        </section>
      </main>
      <CTASection />
      <Footer />
    </>
  );
}
