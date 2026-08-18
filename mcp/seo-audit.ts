import { EXCERPT_MAX, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, TITLE_MAX } from "../src/lib/blog/schema";
import { isValidSlug } from "../src/lib/blog/slug";

/**
 * Audits a draft against the rules the writing guide states.
 *
 * The guide already told the model what to do; nothing checked whether it did.
 * That gap is where weak drafts came from — a missing search description, a brand
 * name doubled into the title, an opening paragraph that sets the scene instead of
 * answering. Each of those is cheap to detect and expensive to notice by eye.
 *
 * Pure and dependency-free, so it can be exercised directly and reused by both
 * `check_seo` and `create_draft`.
 *
 * **Findings are advisory, never blocking.** Schema validation decides what may be
 * saved; this decides what is worth publishing, and that judgement stays with the
 * human reading the draft. A tool that refused to save an imperfect post would
 * just push people back to writing in the editor.
 */

export type Severity = "fail" | "warn" | "info";

export type Finding = {
  /** Stable identifier, so a caller can suppress or track one check. */
  id: string;
  severity: Severity;
  message: string;
  /** What to actually do about it. Omitted when the message already says. */
  fix?: string;
};

export type AuditInput = {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  /** Used to catch the brand being typed into a title the layout already suffixes. */
  wordmark?: string;
};

export type AuditReport = {
  findings: Finding[];
  counts: { fail: number; warn: number; info: number };
  metrics: {
    words: number;
    readingTimeMinutes: number;
    headings: number;
    internalLinks: number;
    externalLinks: number;
  };
  /** True when nothing is a hard failure. Warnings are still worth reading. */
  ready: boolean;
};

/** Words per minute used for the estimate. Matches the site's own reading time. */
const WPM = 225;

/**
 * Claims that read as marketing rather than fact, and cannot be supported.
 * Deliberately short: a long list produces noise and gets ignored.
 */
const ABSOLUTES = [
  "best-in-class",
  "best in class",
  "world-class",
  "cutting-edge",
  "state-of-the-art",
  "revolutionary",
  "seamless",
  "guaranteed",
  "instantly",
  "effortless",
  "game-changing",
];

/** Shapes that usually mean an invented statistic. Flagged for a human to verify. */
const FABRICATION_PATTERNS: { pattern: RegExp; what: string }[] = [
  { pattern: /\b\d{1,3}\s?%/g, what: "a percentage" },
  // No \b before the symbol: "$" is a non-word character, so a word boundary
  // never matches after a space and the check silently never fired.
  { pattern: /(?:\$|£|€)\s?\d[\d,.]*/g, what: "a currency figure" },
  { pattern: /\b\d+(?:\.\d+)?\s?(?:x|times)\s+(?:faster|more|better|higher)\b/gi, what: "a multiplier claim" },
  { pattern: /\bsaved?\s+\d+\s+(?:hours?|days?|weeks?)\b/gi, what: "a time-saving figure" },
  { pattern: /\b(?:our|a)\s+client\b/gi, what: "a client reference" },
  { pattern: /\bcase stud(?:y|ies)\b/gi, what: "a case study" },
];

/**
 * Normalises line endings before anything splits on them.
 *
 * Content round-tripped through Postgres comes back CRLF, so a paragraph break is
 * `\r\n\r\n`. Splitting on `/\n{2,}/` then matches nothing — the `\r` sits between
 * the newlines — and the whole post reads as one paragraph. That made the
 * answer-first check fire on every stored post, reporting a 1,000-word opening.
 */
function normalize(markdown: string): string {
  return markdown.replace(/\r\n?/g, "\n");
}

/** Strips fenced code so prose checks don't fire on code samples. */
function withoutCode(markdown: string): string {
  return normalize(markdown).replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ");
}

function countWords(text: string): number {
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}

/** True when the body starts with a heading, so nothing answers before it. */
function startsWithHeading(markdown: string): boolean {
  const first = withoutCode(markdown)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find(Boolean);
  return first ? /^#{1,6}\s/.test(first) : false;
}

/** First non-empty paragraph that isn't a heading — the post's actual opening. */
function openingParagraph(markdown: string): string {
  const blocks = withoutCode(markdown).split(/\n{2,}/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (/^#{1,6}\s/.test(trimmed)) continue;
    if (/^[>*\-|]/.test(trimmed)) continue;
    return trimmed;
  }
  return "";
}

export function auditDraft(input: AuditInput): AuditReport {
  const findings: Finding[] = [];
  const prose = withoutCode(input.content);

  // ---- metrics -----------------------------------------------------------
  const words = countWords(prose);
  const normalized = normalize(input.content);
  const headings = (normalized.match(/^##\s+/gm) ?? []).length;
  const links = [...normalized.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((m) => m[1]);
  const internalLinks = links.filter((href) => href.startsWith("/")).length;
  const externalLinks = links.filter((href) => /^https?:\/\//.test(href)).length;

  const metrics = {
    words,
    readingTimeMinutes: Math.max(1, Math.round(words / WPM)),
    headings,
    internalLinks,
    externalLinks,
  };

  // ---- title -------------------------------------------------------------
  const title = input.title.trim();
  if (title.length > TITLE_MAX) {
    findings.push({
      id: "title-length",
      severity: "fail",
      message: `Title is ${title.length} characters; the limit is ${TITLE_MAX}.`,
    });
  }

  if (input.wordmark && title.toLowerCase().includes(input.wordmark.toLowerCase())) {
    findings.push({
      id: "title-brand",
      severity: "fail",
      message: `The title contains "${input.wordmark}".`,
      fix: "Remove it — the site layout appends the brand, so this renders twice and wastes search-result width.",
    });
  }

  // ---- search title and description --------------------------------------
  const seoTitle = input.seoTitle?.trim();
  if (seoTitle && seoTitle.length > SEO_TITLE_MAX) {
    findings.push({
      id: "seo-title-length",
      severity: "fail",
      message: `Search title is ${seoTitle.length} characters; the limit is ${SEO_TITLE_MAX}.`,
    });
  }
  if (!seoTitle && title.length > SEO_TITLE_MAX) {
    findings.push({
      id: "seo-title-missing",
      severity: "warn",
      message: `The title is ${title.length} characters, so search results will truncate it.`,
      fix: `Add a search title of ${SEO_TITLE_MAX} characters or fewer, written without the brand.`,
    });
  }

  const seoDescription = input.seoDescription?.trim();
  if (!seoDescription) {
    findings.push({
      id: "seo-description-missing",
      severity: "warn",
      message: "No search description, so the excerpt is used instead.",
      fix: `The excerpt may run to ${EXCERPT_MAX} characters against a search result's ~${SEO_DESCRIPTION_MAX}, so it will be cut mid-sentence. Write a specific promise of what the reader will be able to do.`,
    });
  } else if (seoDescription.length > SEO_DESCRIPTION_MAX) {
    findings.push({
      id: "seo-description-length",
      severity: "fail",
      message: `Search description is ${seoDescription.length} characters; the limit is ${SEO_DESCRIPTION_MAX}.`,
    });
  }

  const excerpt = input.excerpt?.trim();
  if (excerpt && excerpt.length > EXCERPT_MAX) {
    findings.push({
      id: "excerpt-length",
      severity: "fail",
      message: `Excerpt is ${excerpt.length} characters; the limit is ${EXCERPT_MAX}.`,
    });
  }

  // ---- slug --------------------------------------------------------------
  if (input.slug && !isValidSlug(input.slug)) {
    findings.push({
      id: "slug-format",
      severity: "fail",
      message: `"${input.slug}" is not a valid slug.`,
      fix: "Lowercase letters, numbers, and single hyphens only. Call check_slug for a corrected suggestion.",
    });
  }

  // ---- structure ---------------------------------------------------------
  if (/^\s*#\s+/m.test(normalized)) {
    findings.push({
      id: "content-h1",
      severity: "warn",
      message: "The body contains a top-level heading.",
      fix: "The title is already the page's only H1. It is downgraded defensively, but write ## so the source reads the way it renders.",
    });
  }

  if (headings < 2) {
    findings.push({
      id: "headings-few",
      severity: "warn",
      message: `Only ${headings} section heading${headings === 1 ? "" : "s"}.`,
      fix: "Break the post into ## sections, one sub-question each, phrased the way a person would ask.",
    });
  }

  // ---- the opening -------------------------------------------------------
  const opening = openingParagraph(normalized);
  const openingWords = countWords(opening);

  if (startsWithHeading(normalized)) {
    findings.push({
      id: "opening-heading-first",
      severity: "warn",
      message: "The post opens with a heading rather than an answer.",
      fix: "Lead with one or two sentences that answer the query outright. That opening is what gets pulled into featured snippets and AI summaries.",
    });
  }

  if (!opening) {
    findings.push({
      id: "opening-missing",
      severity: "warn",
      message: "The post has no opening paragraph at all.",
      fix: "State the answer in the first 100 words.",
    });
  } else if (openingWords > 120) {
    findings.push({
      id: "opening-long",
      severity: "warn",
      message: `The opening paragraph runs to ${openingWords} words.`,
      fix: "Lead with a direct answer in a sentence or two, then expand. Scene-setting first buries the thing people came for.",
    });
  }

  // ---- internal linking --------------------------------------------------
  if (internalLinks === 0) {
    findings.push({
      id: "links-none",
      severity: "warn",
      message: "No internal links.",
      fix: "Link 2–4 times to the service pages or related posts this article supports. If it supports none, reconsider whether it is worth publishing.",
    });
  } else if (internalLinks === 1) {
    findings.push({
      id: "links-few",
      severity: "warn",
      message: "Only one internal link.",
      fix: "Two to four is the target. Run suggest_internal_links to see which pages and posts this draft has earned.",
    });
  } else if (internalLinks > 8) {
    findings.push({
      id: "links-many",
      severity: "warn",
      message: `${internalLinks} internal links.`,
      fix: "Past a handful they stop reading as recommendations and start reading as filler.",
    });
  }

  // ---- claims ------------------------------------------------------------
  const lowerProse = prose.toLowerCase();
  const foundAbsolutes = ABSOLUTES.filter((word) => lowerProse.includes(word));
  if (foundAbsolutes.length > 0) {
    findings.push({
      id: "absolutes",
      severity: "warn",
      message: `Unsupported absolutes: ${foundAbsolutes.join(", ")}.`,
      fix: "Say what the system does and who it is for, rather than how good it is.",
    });
  }

  const flagged = FABRICATION_PATTERNS.flatMap(({ pattern, what }) => {
    const hits = prose.match(pattern);
    return hits ? [`${what} (${hits.slice(0, 3).join(", ")})`] : [];
  });
  if (flagged.length > 0) {
    findings.push({
      id: "verify-claims",
      severity: "warn",
      message: `Contains ${flagged.join("; ")}.`,
      fix: "Every one of these must be real and approved. A fabricated figure in a published post is far worse than a thin one — verify before publishing.",
    });
  }

  // ---- length ------------------------------------------------------------
  if (words < 300) {
    findings.push({
      id: "thin",
      severity: "warn",
      message: `Only ${words} words.`,
      fix: "Short is fine when the question is small, but check the post actually answers it rather than gesturing at it.",
    });
  }

  findings.push({
    id: "length",
    severity: "info",
    message: `${words} words, about ${metrics.readingTimeMinutes} minute${metrics.readingTimeMinutes === 1 ? "" : "s"} to read.`,
  });

  const counts = {
    fail: findings.filter((f) => f.severity === "fail").length,
    warn: findings.filter((f) => f.severity === "warn").length,
    info: findings.filter((f) => f.severity === "info").length,
  };

  return { findings, counts, metrics, ready: counts.fail === 0 };
}
