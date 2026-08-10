import type { Metadata } from "next";

import { site } from "./site-config";

/**
 * Open Graph helper.
 *
 * Next.js does not deep-merge `openGraph`: a page that declares its own object
 * replaces the root layout's entirely, which silently drops the file-convention
 * image, `site_name`, and `locale`. Every page therefore builds its Open Graph
 * block through this helper so those fields are never lost.
 *
 * The image is referenced by its un-hashed route path. The file convention
 * normally appends a content hash for cache busting; the plain path serves the
 * identical PNG, and hardcoding a hash would rot on the next image edit.
 */
const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Denalix Tech — AI automation and custom software consulting",
};

type OpenGraphInput = {
  /** Full social title, including the brand suffix. */
  title: string;
  description: string;
  /** Site-relative path, resolved against metadataBase. */
  path: string;
  type?: "website" | "article";
  publishedTime?: string;
  images?: { url: string; alt?: string }[];
};

export function pageOpenGraph(input: OpenGraphInput): Metadata["openGraph"] {
  return {
    type: input.type ?? "website",
    siteName: site.fullName,
    locale: "en_US",
    title: input.title,
    description: input.description,
    url: input.path,
    images: input.images ?? [OG_IMAGE],
    ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
  };
}

export function pageTwitter(input: {
  title: string;
  description: string;
  images?: string[];
}): Metadata["twitter"] {
  return {
    card: "summary_large_image",
    title: input.title,
    description: input.description,
    images: input.images ?? [OG_IMAGE.url],
  };
}
