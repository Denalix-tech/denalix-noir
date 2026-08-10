import type { Metadata } from "next";

import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { CTASection } from "@/components/sections/CTASection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { BlogCard } from "@/components/blog/BlogCard";
import { listPublishedPosts } from "@/lib/blog/queries";
import { pageOpenGraph, pageTwitter } from "@/lib/seo";

const TITLE = "AI Automation & Software Guides";
const DESCRIPTION =
  "Practical guides to AI automation, business workflows, dashboards, custom software, GIS, and the systems that help growing companies operate better.";

export const metadata: Metadata = {
  // Root layout appends "| Denalix Tech".
  title: TITLE,
  description: DESCRIPTION,
  // Relative paths resolve against metadataBase, so the canonical always
  // lands on the production www origin regardless of where the build runs.
  alternates: { canonical: "/blog" },
  openGraph: pageOpenGraph({
    title: `${TITLE} | Denalix Tech`,
    description: DESCRIPTION,
    path: "/blog",
  }),
  twitter: pageTwitter({ title: `${TITLE} | Denalix Tech`, description: DESCRIPTION }),
};

/**
 * Re-render at most every 5 minutes so a future-dated post becomes visible
 * without a manual revalidation. Mutations still invalidate this route
 * immediately via revalidatePath.
 */
export const revalidate = 300;

export default async function BlogIndexPage() {
  const posts = await listPublishedPosts();

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-8">
        <section className="container-px mx-auto max-w-7xl">
          <SectionHeading
            as="h1"
            eyebrow="Blog"
            title="Practical guides to AI automation and better business systems"
            description={DESCRIPTION}
            align="center"
            className="mx-auto"
          />

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
        </section>
      </main>
      <CTASection />
      <Footer />
    </>
  );
}
