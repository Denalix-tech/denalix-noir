import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site-url";

/**
 * robots.txt via the Next.js metadata file convention.
 *
 * Scope note: this covers crawl paths only. It deliberately says nothing about
 * AI training or AI search crawlers — that policy is managed at the Cloudflare
 * edge by the owner, and Cloudflare may merge or prepend its own managed
 * directives to this file after deployment. Changing that policy here would
 * silently override an owner decision made elsewhere.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        // Sign-in, dashboard, editor, draft previews, and people management.
        "/admin",
        "/admin/",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/").replace(/\/$/, ""),
  };
}
