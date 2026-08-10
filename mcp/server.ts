#!/usr/bin/env -S npx tsx
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { db, ownerId, textResult, errorResult } from "./lib";
import { coverAltText, renderCoverPng, COVER_WIDTH, COVER_HEIGHT } from "./cover-image";
import { postInputSchema, fieldErrors } from "../src/lib/blog/schema";
import { isValidSlug, slugify } from "../src/lib/blog/slug";
import { serviceLandings } from "../src/lib/services-data";

/**
 * Denalix blog MCP server.
 *
 * Gives Claude Code typed, safe access to the real blog system so drafting is
 * grounded in what actually exists — current posts, real slugs, the real
 * service pages to link to — rather than invented from scratch.
 *
 * Two deliberate constraints:
 *
 *   1. `create_draft` can only ever create a DRAFT. There is no publish tool
 *      here, by design. Publishing stays a human action in /admin/posts.
 *   2. Nothing calls the Anthropic API. The reasoning happens in whichever
 *      Claude client is driving this server, so no API tokens are consumed.
 */

const server = new McpServer({ name: "denalix-blog", version: "1.0.0" });

const ADMIN_POSTS_URL = "http://localhost:3000/admin/posts";

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

server.registerTool(
  "list_posts",
  {
    title: "List blog posts",
    description:
      "List existing blog posts with their status and slug. Call this before drafting so you do not duplicate a topic or collide with an existing slug.",
    inputSchema: {
      status: z
        .enum(["draft", "published", "all"])
        .optional()
        .describe("Filter by status. Defaults to all."),
    },
  },
  async ({ status = "all" }) => {
    try {
      const client = db();
      let query = client
        .from("posts")
        .select("id, title, slug, status, published_at, updated_at")
        .order("updated_at", { ascending: false });

      if (status !== "all") query = query.eq("status", status);

      const { data, error } = await query;
      if (error) return errorResult(`Could not list posts: ${error.message}`);

      return textResult({ count: data?.length ?? 0, posts: data ?? [] });
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }
  },
);

server.registerTool(
  "check_slug",
  {
    title: "Check slug availability",
    description:
      "Check whether a slug is validly formatted and not already taken. Use before create_draft to avoid a failed insert.",
    inputSchema: {
      slug: z.string().describe("The slug to check, e.g. 'automate-patient-intake'"),
    },
  },
  async ({ slug }) => {
    try {
      const normalized = slugify(slug);
      const valid = isValidSlug(slug);

      const client = db();
      const { data, error } = await client
        .from("posts")
        .select("id, title")
        .eq("slug", slug)
        .limit(1);

      if (error) return errorResult(`Could not check slug: ${error.message}`);

      const taken = (data ?? []).length > 0;
      return textResult({
        slug,
        validFormat: valid,
        available: valid && !taken,
        takenBy: taken ? data![0].title : null,
        suggestion: valid ? null : normalized,
      });
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }
  },
);

server.registerTool(
  "get_service_map",
  {
    title: "Get service landing pages",
    description:
      "Return the five service landing pages with the problems and deliverables each one covers. These are the internal-link targets a post should point at, and the commercial pages the blog exists to support.",
    inputSchema: {},
  },
  async () =>
    textResult(
      serviceLandings.map((s) => ({
        url: `/services/${s.slug}`,
        name: s.name,
        h1: s.h1,
        audience: s.audience,
        problems: s.problems,
        deliverables: s.deliverables.map((d) => d.title),
      })),
    ),
);

server.registerTool(
  "suggest_internal_links",
  {
    title: "Suggest internal links",
    description:
      "Given draft text, suggest which service landing pages it should link to and which phrase in the text motivates each link. Internal linking is how a blog post passes value to the commercial pages.",
    inputSchema: {
      content: z.string().describe("The draft body text (Markdown is fine)"),
    },
  },
  async ({ content }) => {
    const haystack = content.toLowerCase();

    const matches = serviceLandings
      .map((service) => {
        // Match against the service's own vocabulary rather than a hardcoded
        // keyword list, so this stays correct as services-data.ts changes.
        const terms = [
          service.name,
          ...service.deliverables.map((d) => d.title),
          ...service.problems,
        ]
          .flatMap((t) => t.toLowerCase().split(/[^a-z]+/))
          .filter((t) => t.length > 5);

        const hits = [...new Set(terms)].filter((t) => haystack.includes(t));
        return { service, hits };
      })
      .filter((m) => m.hits.length > 0)
      .sort((a, b) => b.hits.length - a.hits.length);

    if (matches.length === 0) {
      return textResult(
        "No strong internal-link matches found. Consider whether this post supports any service page at all — if it does not, it may not be worth publishing.",
      );
    }

    return textResult(
      matches.map((m) => ({
        url: `/services/${m.service.slug}`,
        name: m.service.name,
        matchedTerms: m.hits.slice(0, 8),
        strength: m.hits.length,
      })),
    );
  },
);

// ---------------------------------------------------------------------------
// Cover image
// ---------------------------------------------------------------------------

server.registerTool(
  "generate_cover_image",
  {
    title: "Generate a brand cover image",
    description:
      "Render a 1200x630 cover image in the Denalix noir/gold brand system from the post title and upload it to Supabase storage. Returns a public URL and alt text for use in create_draft. Note: this composes the site's own design system into a real PNG — it is not a photographic/diffusion image.",
    inputSchema: {
      title: z.string().describe("Post title, rendered as the cover headline"),
      slug: z.string().describe("Post slug; also seeds the layout variation"),
      eyebrow: z
        .string()
        .optional()
        .describe("Small label above the title, e.g. 'Workflow Automation'"),
    },
  },
  async ({ title, slug, eyebrow }) => {
    try {
      const png = await renderCoverPng({ title, slug, eyebrow });
      const client = db();

      const path = `covers/${slug}-${Date.now().toString(36)}.png`;
      const { error } = await client.storage
        .from("blog-images")
        .upload(path, png, { contentType: "image/png", upsert: false });

      if (error) return errorResult(`Upload failed: ${error.message}`);

      const {
        data: { publicUrl },
      } = client.storage.from("blog-images").getPublicUrl(path);

      return textResult({
        url: publicUrl,
        alt: coverAltText(title),
        width: COVER_WIDTH,
        height: COVER_HEIGHT,
        bytes: png.length,
      });
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }
  },
);

// ---------------------------------------------------------------------------
// Write — draft only, never publish
// ---------------------------------------------------------------------------

server.registerTool(
  "create_draft",
  {
    title: "Create a blog draft",
    description:
      "Create a new post as a DRAFT for human review. This tool cannot publish — a person approves and publishes in /admin/posts. Validates against the same schema the admin editor uses, so anything accepted here will also save there.",
    inputSchema: {
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

      const client = db();

      const { data: existing } = await client
        .from("posts")
        .select("id")
        .eq("slug", parsed.data.slug)
        .limit(1);

      if ((existing ?? []).length > 0) {
        return errorResult(
          `Slug "${parsed.data.slug}" is already taken. Pick another and retry.`,
        );
      }

      const { data, error } = await client
        .from("posts")
        .insert({
          title: parsed.data.title,
          slug: parsed.data.slug,
          excerpt: parsed.data.excerpt,
          content: parsed.data.content,
          cover_image_url: parsed.data.coverImageUrl,
          cover_image_alt: parsed.data.coverImageAlt,
          seo_title: parsed.data.seoTitle,
          seo_description: parsed.data.seoDescription,
          author_id: await ownerId(client),
          // Not configurable on purpose — this server never publishes.
          status: "draft",
          published_at: null,
          source: "ai-assisted",
        })
        .select("id, slug")
        .single();

      if (error || !data) {
        return errorResult(`Insert failed: ${error?.message ?? "unknown error"}`);
      }

      return textResult({
        created: true,
        status: "draft",
        id: data.id,
        slug: data.slug,
        reviewAt: `${ADMIN_POSTS_URL}/${data.id}/edit`,
        note: "Draft only. It is not public and will not be until a human publishes it in /admin/posts.",
      });
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }
  },
);

await server.connect(new StdioServerTransport());
