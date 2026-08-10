import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import * as db from "./adapters/supabase";
import { coverAltText, renderCoverPng, COVER_WIDTH, COVER_HEIGHT } from "./cover-image";
import { errorResult, textResult } from "./lib";
import { loadSites, resolveSite, siteKeys, type SiteConfig } from "./sites";
import { postInputSchema, fieldErrors } from "../src/lib/blog/schema";
import { isValidSlug, slugify } from "../src/lib/blog/slug";

/**
 * The blog tool surface.
 *
 * Every tool that touches content takes an explicit `site`. Two of the sites
 * this serves belong to clients, so there is no default site and no fuzzy key
 * matching: a mistyped key fails with the valid keys listed rather than writing
 * to the wrong company's website. Every response echoes the site it resolved,
 * so a wrong target is visible in the transcript before anything else happens.
 *
 * `create_draft` can only ever create a DRAFT. There is no publish tool here,
 * by design — publishing stays a human action in each site's own admin.
 *
 * Nothing here calls the Anthropic API. The reasoning happens in whichever
 * Claude client drives this server, so no API tokens are consumed.
 */

const siteParam = z
  .string()
  .describe(`Site key. One of: ${siteKeys().join(", ")}. Call list_sites for details.`);

/** Identifies the resolved target in every response, so a mistake is obvious. */
function siteEcho(site: SiteConfig) {
  return { key: site.key, name: site.name, origin: site.origin };
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function registerBlogTools(server: McpServer): void {
  // -------------------------------------------------------------------------
  // Discovery
  // -------------------------------------------------------------------------

  server.registerTool(
    "list_sites",
    {
      title: "List publishable sites",
      description:
        "List the sites this server can draft for, with their public origin. Call this first when you do not know the exact site key — every other tool requires one.",
      inputSchema: {},
    },
    async () =>
      textResult(
        loadSites().map((site) => ({
          key: site.key,
          name: site.name,
          origin: site.origin,
          linkTargets: site.linkTargets.length,
        })),
      ),
  );

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  server.registerTool(
    "list_posts",
    {
      title: "List blog posts",
      description:
        "List existing blog posts on one site with their status and slug. Call this before drafting so you do not duplicate a topic or collide with an existing slug.",
      inputSchema: {
        site: siteParam,
        status: z
          .enum(["draft", "published", "all"])
          .optional()
          .describe("Filter by status. Defaults to all."),
      },
    },
    async ({ site: siteKey, status = "all" }) => {
      try {
        const site = resolveSite(siteKey);
        const posts = await db.listPosts(site, status);
        return textResult({ site: siteEcho(site), count: posts.length, posts });
      } catch (err) {
        return errorResult(message(err));
      }
    },
  );

  server.registerTool(
    "check_slug",
    {
      title: "Check slug availability",
      description:
        "Check whether a slug is validly formatted and not already taken on one site. Use before create_draft to avoid a failed insert. Slugs are unique per site, so the same slug can exist on two different sites.",
      inputSchema: {
        site: siteParam,
        slug: z.string().describe("The slug to check, e.g. 'automate-patient-intake'"),
      },
    },
    async ({ site: siteKey, slug }) => {
      try {
        const site = resolveSite(siteKey);
        const normalized = slugify(slug);
        const valid = isValidSlug(slug);
        const { taken, takenBy } = await db.checkSlug(site, slug);

        return textResult({
          site: siteEcho(site),
          slug,
          validFormat: valid,
          available: valid && !taken,
          takenBy,
          suggestion: valid ? null : normalized,
        });
      } catch (err) {
        return errorResult(message(err));
      }
    },
  );

  server.registerTool(
    "get_link_targets",
    {
      title: "Get a site's internal-link targets",
      description:
        "Return the commercial pages a post on this site should link to, with the audience and problems each one covers. These are the pages the blog exists to support, and their problem statements are the best source of post topics.",
      inputSchema: { site: siteParam },
    },
    async ({ site: siteKey }) => {
      try {
        const site = resolveSite(siteKey);
        return textResult({
          site: siteEcho(site),
          targets: site.linkTargets.map((target) => ({
            url: target.url,
            name: target.name,
            headline: target.headline,
            audience: target.audience,
            problems: target.problems,
            deliverables: target.deliverables,
          })),
        });
      } catch (err) {
        return errorResult(message(err));
      }
    },
  );

  server.registerTool(
    "suggest_internal_links",
    {
      title: "Suggest internal links",
      description:
        "Given draft text, suggest which of a site's pages it should link to and which phrases motivate each link. Internal linking is how a blog post passes value to the commercial pages. Suggestions only — you still write the links into the draft.",
      inputSchema: {
        site: siteParam,
        content: z.string().describe("The draft body text (Markdown is fine)"),
      },
    },
    async ({ site: siteKey, content }) => {
      try {
        const site = resolveSite(siteKey);
        const haystack = content.toLowerCase();

        // Matched against each page's own vocabulary rather than a hardcoded
        // keyword list, so this stays correct as a site's pages change.
        const matches = site.linkTargets
          .map((target) => ({
            target,
            hits: [...new Set(target.terms)].filter((term) => haystack.includes(term)),
          }))
          .filter((match) => match.hits.length > 0)
          .sort((a, b) => b.hits.length - a.hits.length);

        if (matches.length === 0) {
          return textResult({
            site: siteEcho(site),
            matches: [],
            note: `No strong internal-link matches found on ${site.name}. Consider whether this post supports any commercial page at all — if it does not, it may not be worth publishing.`,
          });
        }

        return textResult({
          site: siteEcho(site),
          matches: matches.map((match) => ({
            url: match.target.url,
            name: match.target.name,
            matchedTerms: match.hits.slice(0, 8),
            strength: match.hits.length,
          })),
        });
      } catch (err) {
        return errorResult(message(err));
      }
    },
  );

  // -------------------------------------------------------------------------
  // Cover image
  // -------------------------------------------------------------------------

  server.registerTool(
    "generate_cover_image",
    {
      title: "Generate a brand cover image",
      description:
        "Render a 1200x630 cover image in the target site's own brand system from the post title, and upload it to that site's storage. Returns a public URL and alt text for use in create_draft. Note: this composes a design system into a real PNG — it is not a photographic/diffusion image.",
      inputSchema: {
        site: siteParam,
        title: z.string().describe("Post title, rendered as the cover headline"),
        slug: z.string().describe("Post slug; also seeds the layout variation"),
        eyebrow: z
          .string()
          .optional()
          .describe("Small label above the title, e.g. 'Workflow Automation'"),
      },
    },
    async ({ site: siteKey, title, slug, eyebrow }) => {
      try {
        const site = resolveSite(siteKey);
        const png = await renderCoverPng({ title, slug, eyebrow, brand: site.brand });
        const { url } = await db.uploadCover(site, png, slug);

        return textResult({
          site: siteEcho(site),
          url,
          alt: coverAltText(title, site.brand.wordmark),
          width: COVER_WIDTH,
          height: COVER_HEIGHT,
          bytes: png.length,
        });
      } catch (err) {
        return errorResult(message(err));
      }
    },
  );

  // -------------------------------------------------------------------------
  // Write — draft only, never publish
  // -------------------------------------------------------------------------

  server.registerTool(
    "create_draft",
    {
      title: "Create a blog draft",
      description:
        "Create a new post on one site as a DRAFT for human review. This tool cannot publish — a person approves and publishes in that site's own admin. Validates against the same schema the admin editor uses, so anything accepted here will also save there.",
      inputSchema: {
        site: siteParam,
        title: z.string().describe("Post title, 1-160 characters"),
        slug: z
          .string()
          .optional()
          .describe("URL slug. Derived from the title when omitted."),
        excerpt: z.string().describe("Short summary, max 320 characters"),
        content: z.string().describe("Post body as Markdown"),
        coverImageUrl: z
          .string()
          .optional()
          .describe("Cover image URL, typically from generate_cover_image"),
        coverImageAlt: z
          .string()
          .optional()
          .describe("Alt text; required when coverImageUrl is set"),
        seoTitle: z.string().optional().describe("SEO title, max 60 characters"),
        seoDescription: z
          .string()
          .optional()
          .describe("SEO description, max 160 characters"),
      },
    },
    async (input) => {
      try {
        const site = resolveSite(input.site);
        const slug = input.slug?.trim() || slugify(input.title);

        const parsed = postInputSchema.safeParse({
          title: input.title,
          slug,
          excerpt: input.excerpt,
          content: input.content,
          coverImageUrl: input.coverImageUrl ?? "",
          coverImageAlt: input.coverImageAlt ?? "",
          seoTitle: input.seoTitle ?? "",
          seoDescription: input.seoDescription ?? "",
        });

        if (!parsed.success) {
          return errorResult(
            `Validation failed:\n${JSON.stringify(fieldErrors(parsed.error), null, 2)}`,
          );
        }

        const created = await db.createDraft(site, parsed.data);

        return textResult({
          site: siteEcho(site),
          created: true,
          status: "draft",
          id: created.id,
          slug: created.slug,
          publicUrlWhenPublished: `${site.origin}/blog/${created.slug}`,
          reviewAt: created.reviewUrl,
          note: `Draft only, on ${site.name}. It is not public and will not be until a human publishes it in that site's admin.`,
        });
      } catch (err) {
        return errorResult(message(err));
      }
    },
  );
}
