import type { MetadataRoute } from "next";

import { listPublishedSlugs } from "@/lib/blog/queries";
import { serviceLandings } from "@/lib/services-data";
import { absoluteUrl, STATIC_ROUTES } from "@/lib/site-url";

/**
 * Sitemap for public marketing and blog routes.
 *
 * Always returns the full set of static routes on the canonical www origin,
 * with or without Supabase — an unconfigured database must never produce an
 * empty sitemap.
 *
 * `lastModified` is set only where a real date exists (a post's publication
 * date). Stamping `new Date()` on every entry every request tells crawlers the
 * whole site changed constantly, which is both untrue and actively unhelpful.
 *
 * Never included: /admin and everything under it, draft previews, drafts,
 * future-dated posts. `listPublishedSlugs` already filters the last two, and
 * admin routes are simply absent from the route lists below.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const priorities: Record<string, number> = {
    "/": 1,
    "/services": 0.9,
    "/contact": 0.8,
    "/products": 0.7,
    "/how-it-works": 0.7,
    "/blog": 0.7,
    "/about": 0.6,
  };

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route),
    changeFrequency: route === "/blog" ? "weekly" : "monthly",
    priority: priorities[route] ?? 0.6,
  }));

  // Commercial landing pages: stable content, high commercial intent.
  const serviceEntries: MetadataRoute.Sitemap = serviceLandings.map((service) => ({
    url: absoluteUrl(`/services/${service.slug}`),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  // Blog posts are additive; a Supabase outage degrades to the static sitemap
  // rather than failing the route.
  let postEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await listPublishedSlugs();
    postEntries = posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.published_at ? new Date(post.published_at) : undefined,
      changeFrequency: "yearly",
      priority: 0.6,
    }));
  } catch (error) {
    console.error("[sitemap] blog posts unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return [...staticEntries, ...serviceEntries, ...postEntries];
}
