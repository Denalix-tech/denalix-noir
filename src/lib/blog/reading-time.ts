const WORDS_PER_MINUTE = 200;

/**
 * Estimates reading time from Markdown source. Derived at render time rather
 * than stored, so edits can never leave a stale value behind.
 */
export function readingTimeMinutes(markdown: string): number {
  const prose = markdown
    // Fenced code blocks are skimmed, not read word by word.
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    // Keep link/image label text, drop the URL.
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[>#\-*+\s]+/gm, " ");

  const words = prose.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function formatReadingTime(markdown: string): string {
  return `${readingTimeMinutes(markdown)} min read`;
}
