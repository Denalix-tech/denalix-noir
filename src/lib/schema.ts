import { site } from "./site-config";
import { absoluteUrl, SITE_ORIGIN } from "./site-url";

/**
 * Structured-data builders.
 *
 * Every property here is backed by something visible on the site or by the
 * brand configuration. Deliberately absent: address, telephone, founder,
 * employee, award, aggregateRating, review, price, availability, and `sameAs`
 * — none of those are verified, and inventing them would be both dishonest and
 * a rich-results violation.
 */

/** Stable @id so other entities can reference the organization by node. */
export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

export function organizationSchema(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: site.fullName,
    alternateName: site.name,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo-metallic.svg"),
    description: site.description,
    email: site.email,
  };
}

export function websiteSchema(): Record<string, unknown> {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: site.fullName,
    url: absoluteUrl("/"),
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/** Homepage graph: organization plus website, in one script tag. */
export function homepageSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationSchema(), websiteSchema()],
  };
}

export type BreadcrumbEntry = { name: string; path: string };

export function breadcrumbSchema(entries: BreadcrumbEntry[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: absoluteUrl(entry.path),
    })),
  };
}

export function serviceSchema(input: {
  name: string;
  description: string;
  path: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    serviceType: input.name,
    provider: {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: site.fullName,
      url: absoluteUrl("/"),
    },
  };
}

/**
 * Article schema for a published post. Optional properties are omitted rather
 * than filled with placeholders when the underlying data is absent.
 */
export function blogPostingSchema(input: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string | null;
  updatedAt?: string | null;
  imageUrl?: string | null;
  authorName?: string | null;
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    url: absoluteUrl(`/blog/${input.slug}`),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/blog/${input.slug}`),
    },
    publisher: { "@id": ORGANIZATION_ID },
  };

  if (input.publishedAt) schema.datePublished = input.publishedAt;
  if (input.updatedAt) schema.dateModified = input.updatedAt;
  if (input.imageUrl) schema.image = input.imageUrl;
  // Only a display name that is actually rendered on the page.
  if (input.authorName) schema.author = { "@type": "Person", name: input.authorName };

  return schema;
}
