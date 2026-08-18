import { listPublishedPosts } from "@/lib/blog/queries";
import { site } from "@/lib/site-config";
import { absoluteUrl, SITE_ORIGIN } from "@/lib/site-url";

/**
 * RSS 2.0 feed of published posts.
 *
 * The cheapest distribution available: it is the universal input to newsletter
 * tools, aggregators, Medium's importer, and cross-posting services, none of
 * which need anything built for them individually.
 *
 * Excerpts only, not full bodies. A feed carrying whole articles invites
 * scrapers to republish them in full, and a duplicate that outranks the original
 * is a worse outcome than a smaller feed.
 */

export const runtime = "nodejs";

/** Matches the blog index, so a future-dated post appears without a deploy. */
export const revalidate = 300;

/** Escapes the five characters XML cannot carry literally. */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const posts = await listPublishedPosts({ limit: 50 });

  const items = posts
    .map((post) => {
      const url = absoluteUrl(`/blog/${post.slug}`);
      // pubDate must be RFC 822. toUTCString produces exactly that.
      const published = post.published_at
        ? new Date(post.published_at).toUTCString()
        : undefined;

      return [
        "    <item>",
        `      <title>${xml(post.title)}</title>`,
        `      <link>${xml(url)}</link>`,
        // isPermaLink=false: the guid identifies the item, it is not a second URL.
        `      <guid isPermaLink="false">${xml(url)}</guid>`,
        published ? `      <pubDate>${published}</pubDate>` : "",
        `      <description>${xml(post.excerpt)}</description>`,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const latest = posts.find((post) => post.published_at)?.published_at;

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(`${site.fullName} — Blogs`)}</title>
    <link>${xml(`${SITE_ORIGIN}/blog`)}</link>
    <description>${xml(site.description)}</description>
    <language>en</language>
    <atom:link href="${xml(absoluteUrl("/feed.xml"))}" rel="self" type="application/rss+xml" />
${latest ? `    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>` : ""}
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      // Readers poll far more often than posts appear.
      "cache-control": "public, max-age=600, s-maxage=600",
    },
  });
}
