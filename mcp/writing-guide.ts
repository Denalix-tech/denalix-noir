import type { SiteConfig } from "./sites";
import {
  EXCERPT_MAX,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  TITLE_MAX,
} from "../src/lib/blog/schema";

/**
 * The drafting brief, served to whichever model is driving this server.
 *
 * Claude Code picks these rules up from `AGENTS.md` and `docs/` because it can
 * read the repository. Every other client — ChatGPT over HTTP especially — sees
 * only tool schemas, so without this the model has the mechanics and none of
 * the judgment: it will produce posts that validate, rank for nothing, and may
 * invent a case study.
 *
 * This mirrors `docs/features/PUBLISHING_BLOGS.md` §5 and §8. **When that
 * document changes, change this too** — it is the same guidance addressed to a
 * model instead of a person.
 *
 * Field limits are imported rather than restated so the numbers cannot drift
 * from the schema that enforces them.
 */

export function writingGuide(site: SiteConfig): string {
  const links = site.linkTargets
    .map((target) => `- \`${target.url}\` — ${target.name}`)
    .join("\n");

  return `# Drafting brief for ${site.name} (${site.origin})

You are drafting a post that a human will review and publish. Follow every rule
below. Call \`get_link_targets\` for this site's pages before you start.

## 1. Pick one query, not a topic

Write down the literal sentence someone would type into a search engine, and
answer that one thing. A post that answers three questions ranks for none of
them. If you cannot state the query in one sentence, the post is not ready.

The best sources are the \`problems\` returned by \`get_link_targets\` — those are
written in customer language and are real queries.

## 2. Match the format to the intent

| Query shape | Write |
| --- | --- |
| "how to…", "how do I…" | Step-by-step guide, numbered \`##\` sections |
| "what is…", "…meaning" | Definition first, answered in the opening paragraph, then nuance |
| "X vs Y", "best way to…" | Honest comparison with a criteria table and a recommendation |
| "cost of…", "how long does…" | Ranges plus the variables that move them. Never invent a figure |

## 3. Title

Front-load the searched phrase. Read like an answer, not a slogan.
Max ${TITLE_MAX} characters.

**Never put the brand in the title.** The site layout appends its own brand
suffix. Typing it yourself produces a doubled brand and wastes search-result
width.

- Good: \`How to stop retyping customer data between systems\`
- Bad: \`Unlock the power of seamless data synergy\`

## 4. Answer in the first 100 words

State the answer before any background. This is what gets pulled into featured
snippets and AI summaries. Scene-setting comes after it, or not at all.

## 5. Structure

The title is already the page's only \`<h1>\`. Start body headings at \`##\`, one
sub-question each, phrased the way a person would ask. Use \`###\` only for real
subdivisions.

Markdown with GFM tables. **Raw HTML is inert** — \`<iframe>\`, \`<div>\`, and
embed scripts render as visible text, so use Markdown equivalents. Do not paste
canonical tags, Open Graph tags, JSON-LD, or a duplicate \`# Title\` into the
body; all of that is generated automatically and duplicating it is harmful.

## 6. Earn 2–4 internal links

Two kinds, and both matter.

**Service pages** are why the blog exists: they pass readers and authority to the
commercial side. **Related posts** build topic clusters — a group of articles that
link to each other ranks better than the same articles in isolation, because the
connections tell a search engine the site covers a subject rather than mentioning
it once.

Link with descriptive anchor text — \`[workflow automation](/services/workflow-automation)\`,
never "click here". This site's pages:

${links}

Run \`suggest_internal_links\` on your draft: it returns both the service pages and
any published posts this draft has earned a link to. Link to a related post where
the argument genuinely calls for it — two posts pointing at each other is a
cluster; a list of links at the bottom is not. If the post supports no commercial
page at all, reconsider whether it is worth publishing.

## 7. Excerpt and SEO description are different things

- **Excerpt** (max ${EXCERPT_MAX}) — appears on the blog index card, beside the cover.
  Room for a real summary.
- **SEO description** (max ${SEO_DESCRIPTION_MAX}) — appears under the title in search results,
  competing with nine other results. Make it a specific promise about what the
  reader will be able to do. Not a keyword list.

**Always fill the SEO description.** Leaving it blank falls back to the excerpt,
whose limit is more than double, so it truncates mid-sentence in search results.

**SEO title** (max ${SEO_TITLE_MAX}) is optional — fill it when the on-page title is too
long for a search result. Write it without the brand.

## 8. Cover image

Call \`generate_cover_image\` and pass the returned \`url\` and \`alt\` to
\`create_draft\`. It always returns a usable cover.

**Do not pass an image you generated in this conversation.** Its URL is
session-scoped and not publicly readable, so this server cannot fetch it — the
call will simply fall back to the brand cover. That is a platform limitation, not
a setting to change. If you have generated a good image, say so in your reply and
tell the human they can upload it themselves on the post's edit screen.

\`imageUrl\` is for artwork **already hosted at a public https URL** — an asset on
the site, a stock image the human has licensed and linked. PNG, JPEG, or WebP;
SVG is refused. It is cropped to 1200×630. When you use it, also pass \`imageAlt\`
describing what the image *shows*: the default brand-cover alt text would describe
a cover that is not what was uploaded.

Omit \`imageUrl\` and you get a typographic cover in the site's brand, whose
generated alt text is already correct.

## 9. Claims you must never invent

This is the rule that matters most, because a fabricated claim in a published
post is far worse than a thin one. Do not write:

- client names, logos, or case studies
- metrics, percentages, ROI figures, or time savings
- testimonials or quotes
- certifications, partnerships, awards, or team members
- specific prices or delivery timelines

If you do not have a fact from the tool results or the human you are working
with, write about the mechanism instead of the outcome. Say what a system does
and who it is for.

Avoid unsupported absolutes: "best", "guaranteed", "instant", "seamless",
"cutting-edge". No padding to reach a word count, and no repeating keyword
variants.

## 10. Before calling create_draft

1. \`check_slug\` — 3–6 meaningful words, no dates, no stop words. Slugs are
   permanent in practice: renaming a published post breaks its URL and there is
   no automatic redirect.
2. \`list_posts\` — confirm you are not duplicating an existing topic.
3. \`suggest_internal_links\` — confirm your links are the right ones, service
   pages and related posts alike.
4. \`check_seo\` — audits this draft against everything above: title and
   description lengths, the brand accidentally in the title, whether you answered
   before setting the scene, heading structure, link count, unsupported
   absolutes, and figures that look invented. Fix the failures; use judgement on
   the warnings. \`create_draft\` reports the same findings, so a weak draft is
   visible to whoever reviews it either way.

\`create_draft\` creates a **draft only**. It cannot publish, and no tool here
can. A human reviews it in the site's admin, checks every factual claim, and
publishes. Write as though the person who has to defend the claims is the person
reading it next — because they are.
`;
}
