import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import * as db from "./adapters/supabase";
import { coverAltText, renderCoverWebp, COVER_WIDTH, COVER_HEIGHT } from "./cover-image";
import { fetchExternalImage } from "./image-fetch";
import { auditDraft } from "./seo-audit";
import { errorResult, textResult } from "./lib";
import { loadSites, resolveSite, siteKeys, type SiteConfig } from "./sites";
import { writingGuide } from "./writing-guide";
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

/**
 * OAuth scopes, duplicated as literals rather than imported from
 * `src/lib/mcp-auth/config.ts`.
 *
 * That module is `server-only`, which throws outside a React Server Component —
 * this file also runs as a plain Node process over stdio. The strings are part of
 * the OAuth wire contract and will not change silently; `src/lib/mcp-auth/config.ts`
 * is the source of truth and the values must match it.
 */
const SCOPE_READ = "blog:read";
const SCOPE_DRAFT = "blog:draft";

export type ToolOptions = {
  /**
   * Scopes granted to the caller.
   *
   * `undefined` means an unscoped, locally trusted transport — the stdio server
   * launched by your own editor — and every tool is registered. When present,
   * only tools covered by the grant are registered, so a read-only token does not
   * even see `create_draft` in `tools/list`.
   *
   * Registration-time filtering is the enforcement point rather than a check
   * inside each handler: a tool that is never registered cannot be called at all,
   * which leaves no handler to get the check wrong.
   */
  grantedScopes?: readonly string[];
};

function grants(options: ToolOptions | undefined, scope: string): boolean {
  if (!options?.grantedScopes) return true;
  return options.grantedScopes.includes(scope);
}

/** Identifies the resolved target in every response, so a mistake is obvious. */
function siteEcho(site: SiteConfig) {
  return { key: site.key, name: site.name, origin: site.origin };
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function registerBlogTools(server: McpServer, options?: ToolOptions): void {
  const canRead = grants(options, SCOPE_READ);
  const canDraft = grants(options, SCOPE_DRAFT);

  // Needed to name a site for any other call, so available under either scope.
  if (canRead || canDraft) registerDiscoveryTools(server);
  if (canRead) registerReadTools(server);
  if (canDraft) registerWriteTools(server);
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

function registerDiscoveryTools(server: McpServer): void {
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

}

// ---------------------------------------------------------------------------
// Reads — blog:read
// ---------------------------------------------------------------------------

function registerReadTools(server: McpServer): void {
  server.registerTool(
    "get_writing_guide",
    {
      title: "Get the writing and SEO brief",
      description:
        "Read this BEFORE drafting any post. Returns the required structure, SEO rules, field limits, internal-link targets, and the list of claims that must never be invented. Clients that cannot read this repository have no other source for these rules.",
      inputSchema: { site: siteParam },
    },
    async ({ site: siteKey }) => {
      try {
        const site = resolveSite(siteKey);
        return textResult(writingGuide(site));
      } catch (err) {
        return errorResult(message(err));
      }
    },
  );

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
    "check_seo",
    {
      title: "Audit a draft against the SEO rules",
      description:
        "Check a draft against the rules in get_writing_guide before saving it: title and description lengths, the brand accidentally typed into the title, whether the post answers in its opening rather than setting the scene, heading structure, internal link count, unsupported absolutes, and figures that look invented. Returns findings, not a verdict — fix what matters and use your judgement on the rest. Run this before create_draft.",
      inputSchema: {
        site: siteParam,
        title: z.string().describe("Post title"),
        content: z.string().describe("Post body as Markdown"),
        slug: z.string().optional().describe("Intended slug, if chosen"),
        excerpt: z.string().optional().describe("Card summary"),
        seoTitle: z.string().optional().describe("Search title, if set"),
        seoDescription: z.string().optional().describe("Search description, if set"),
      },
    },
    async ({ site: siteKey, title, content, slug, excerpt, seoTitle, seoDescription }) => {
      try {
        const site = resolveSite(siteKey);
        const report = auditDraft({
          title,
          content,
          slug,
          excerpt,
          seoTitle,
          seoDescription,
          wordmark: site.brand.wordmark,
        });

        return textResult({
          site: siteEcho(site),
          ...report,
          note: report.counts.fail
            ? "Failures will be rejected by create_draft's schema. Fix those first."
            : "Nothing blocking. Warnings are judgement calls — read them before publishing.",
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
        "Given draft text, suggest which of a site's pages AND which already-published posts it should link to, with the phrases motivating each. Links to service pages pass value to the commercial pages; links to related posts build the topic clusters that make a group of articles rank better than the same articles in isolation. Suggestions only — you still write the links into the draft.",
      inputSchema: {
        site: siteParam,
        content: z.string().describe("The draft body text (Markdown is fine)"),
        excludeSlug: z
          .string()
          .optional()
          .describe("Slug of the draft itself, so it is not suggested as a link to itself"),
      },
    },
    async ({ site: siteKey, content, excludeSlug }) => {
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

        // Related published posts. Words shorter than six characters are dropped
        // for the same reason the service-page vocabulary drops them: "system"
        // and "process" match everything and rank nothing.
        const published = await db.listLinkablePosts(site);
        const relatedPosts = published
          .filter((post) => post.slug !== excludeSlug)
          .map((post) => {
            const terms = [
              ...new Set(
                `${post.title} ${post.excerpt}`
                  .toLowerCase()
                  .split(/[^a-z]+/)
                  .filter((term) => term.length > 5),
              ),
            ];
            return { post, hits: terms.filter((term) => haystack.includes(term)) };
          })
          .filter((match) => match.hits.length >= 2)
          .sort((a, b) => b.hits.length - a.hits.length)
          .slice(0, 4)
          .map((match) => ({
            url: `/blog/${match.post.slug}`,
            title: match.post.title,
            matchedTerms: match.hits.slice(0, 8),
            strength: match.hits.length,
          }));

        if (matches.length === 0 && relatedPosts.length === 0) {
          return textResult({
            site: siteEcho(site),
            servicePages: [],
            relatedPosts: [],
            note: `No strong internal-link matches found on ${site.name}. Consider whether this post supports any commercial page at all — if it does not, it may not be worth publishing.`,
          });
        }

        return textResult({
          site: siteEcho(site),
          servicePages: matches.map((match) => ({
            url: match.target.url,
            name: match.target.name,
            matchedTerms: match.hits.slice(0, 8),
            strength: match.hits.length,
          })),
          relatedPosts,
          note:
            relatedPosts.length > 0
              ? "Link to a related post where the argument genuinely calls for it. Two posts pointing at each other is a topic cluster; a list of links at the bottom is not."
              : `No published post on ${site.name} is close enough to link to yet. That is expected early on — clusters form as the archive grows.`,
        });
      } catch (err) {
        return errorResult(message(err));
      }
    },
  );

}

// ---------------------------------------------------------------------------
// Writes — blog:draft
//
// Both tools here mutate something: one uploads to storage, the other inserts a
// row. Neither can publish.
// ---------------------------------------------------------------------------

function registerWriteTools(server: McpServer): void {
  server.registerTool(
    "generate_cover_image",
    {
      title: "Generate or import a cover image",
      description:
        "Produce a 1200x630 cover and upload it to the site's storage, returning a public URL and alt text for create_draft. Pass imageUrl to import your own artwork from a PUBLICLY reachable https URL; omit it to compose a typographic cover in the site's brand. If an imageUrl is supplied but cannot be used, the brand cover is produced instead and the response says why — so this tool always yields a usable cover. NOTE: images generated inside a ChatGPT conversation are not publicly readable and cannot be imported; see the `imageUrl` guidance.",
      inputSchema: {
        site: siteParam,
        title: z.string().describe("Post title, rendered as the cover headline"),
        slug: z.string().describe("Post slug; also seeds the layout variation"),
        eyebrow: z
          .string()
          .optional()
          .describe("Small label above the title, e.g. 'Workflow Automation'"),
        imageUrl: z
          .string()
          .optional()
          .describe(
            "Optional https URL of a PNG/JPEG/WebP to use as the cover, cropped to 1200x630. Must be publicly reachable without authentication — an image you generated in this chat is NOT (its URL is session-scoped), so do not pass one. Use this only for artwork already hosted somewhere public. SVG is refused.",
          ),
        imageAlt: z
          .string()
          .optional()
          .describe(
            "Alt text describing what an imported image SHOWS. Required in practice when imageUrl is used: the generated brand-cover alt text would describe a cover that is not what was uploaded.",
          ),
      },
    },
    async ({ site: siteKey, title, slug, eyebrow, imageUrl, imageAlt }) => {
      try {
        const site = resolveSite(siteKey);

        let image: Buffer | null = null;
        let source = "composed-brand-cover";
        let alt = coverAltText(title, site.brand.wordmark);
        let fellBackBecause: string | null = null;
        let sourceBytes: number | null = null;

        if (imageUrl) {
          try {
            const fetched = await fetchExternalImage(imageUrl);
            image = fetched.image;
            sourceBytes = fetched.sourceBytes;
            source = `imported (${fetched.sourceType}, ${fetched.sourceBytes} bytes)`;
            // The brand-cover alt text describes a typographic cover, so it would
            // be actively wrong for imported artwork. Better to say so than to
            // attach a confidently incorrect description.
            alt =
              imageAlt?.trim() ||
              "Cover image for this article. Replace this alt text with a description of what the image shows.";
          } catch (err) {
            // Never fail the call for a bad URL: the brand cover is always
            // available, and a post with a cover beats an error.
            fellBackBecause = message(err);
          }
        }

        if (!image) {
          image = await renderCoverWebp({ title, slug, eyebrow, brand: site.brand });
        }

        // WebP for both paths. Page weight is a ranking factor, and the cover is
        // the heaviest thing on a post.
        const { url } = await db.uploadCover(site, image, slug, {
          ext: "webp",
          contentType: "image/webp",
        });

        return textResult({
          site: siteEcho(site),
          url,
          alt,
          source,
          ...(fellBackBecause
            ? {
                fellBackToBrandCover: true,
                reason: fellBackBecause,
                note: "The imported image was not usable, so the brand cover was produced instead. The returned url is valid and ready for create_draft.",
              }
            : {}),
          width: COVER_WIDTH,
          height: COVER_HEIGHT,
          format: "webp",
          bytes: image.length,
          ...(sourceBytes
            ? { savedVersusSource: `${Math.round((1 - image.length / sourceBytes) * 100)}% smaller than the source file` }
            : {}),
        });
      } catch (err) {
        return errorResult(message(err));
      }
    },
  );

  server.registerTool(
    "create_draft",
    {
      title: "Create a blog draft",
      description:
        "Create a new post on one site as a DRAFT for human review. Call get_writing_guide first — a draft written without it will not meet this site's SEO and factual-accuracy rules. This tool cannot publish; a person approves and publishes in that site's own admin. Validates against the same schema the admin editor uses, so anything accepted here will also save there.",
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

        // The same audit check_seo runs, reported after the save rather than
        // before it. Blocking here would push people back to writing in the
        // editor, where nothing checks at all; surfacing it means a weak draft is
        // visible to whoever reviews it.
        const report = auditDraft({
          title: parsed.data.title,
          content: parsed.data.content,
          slug: parsed.data.slug,
          excerpt: parsed.data.excerpt,
          seoTitle: parsed.data.seoTitle ?? undefined,
          seoDescription: parsed.data.seoDescription ?? undefined,
          wordmark: site.brand.wordmark,
        });

        return textResult({
          site: siteEcho(site),
          created: true,
          status: "draft",
          id: created.id,
          slug: created.slug,
          publicUrlWhenPublished: `${site.origin}/blog/${created.slug}`,
          reviewAt: created.reviewUrl,
          seo: {
            metrics: report.metrics,
            findings: report.findings.filter((finding) => finding.severity !== "info"),
          },
          note: `Draft only, on ${site.name}. It is not public and will not be until a human publishes it in that site's admin.${
            report.counts.warn
              ? ` ${report.counts.warn} SEO warning${report.counts.warn === 1 ? "" : "s"} — worth fixing before it is published.`
              : ""
          }`,
        });
      } catch (err) {
        return errorResult(message(err));
      }
    },
  );
}
