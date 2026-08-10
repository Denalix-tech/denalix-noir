import sharp from "sharp";

/**
 * Brand cover-image generator.
 *
 * Claude has no image model, so "generated image" here means rendered from the
 * site's own design system rather than produced by a diffusion model: a
 * composed SVG rasterised to PNG. That keeps covers free, instant, perfectly
 * on-brand, and dependent on no third-party API or key.
 *
 * The trade-off is honest: these are typographic covers in the noir/gold
 * system, not photographs. For photographic art a paid image API would be
 * required.
 */

export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 630;

const INK = "#000000";
const FOREGROUND = "#f5f5f5";
const MUTED = "#9a9a9a";
const ACCENT = "#f2b84b";

/** Stable per-slug seed so a given post always renders the same cover. */
function seed(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Greedy word wrap. SVG has no text flow, so lines are computed here using an
 * average glyph-width ratio for the bold sans stack below.
 */
function wrap(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Picks the largest type size that keeps the title within 4 lines. */
function fitTitle(title: string): { size: number; lines: string[] } {
  const usableWidth = COVER_WIDTH - 144;
  for (const size of [66, 58, 50, 44]) {
    const maxChars = Math.floor(usableWidth / (size * 0.53));
    const lines = wrap(title, maxChars);
    if (lines.length <= 4) return { size, lines };
  }
  const size = 40;
  const maxChars = Math.floor(usableWidth / (size * 0.53));
  return { size, lines: wrap(title, maxChars).slice(0, 5) };
}

export type CoverInput = {
  title: string;
  slug: string;
  /** Small label above the title, e.g. "Workflow Automation". */
  eyebrow?: string;
};

export function buildCoverSvg({ title, slug, eyebrow }: CoverInput): string {
  const s = seed(slug);
  // Subtle, on-brand variation so a run of posts doesn't look identical.
  const glowX = 780 + (s % 340);
  const glowY = 40 + ((s >> 3) % 160);
  const glowR = 380 + ((s >> 7) % 160);
  const rule = (s >> 11) % 2 === 0;

  const { size, lines } = fitTitle(title);
  const lineHeight = Math.round(size * 1.18);
  // Bottom-anchored block so covers with 1 and 4 lines stay balanced.
  const blockBottom = COVER_HEIGHT - 132;
  const firstBaseline = blockBottom - (lines.length - 1) * lineHeight;

  const titleTspans = lines
    .map(
      (line, i) =>
        `<tspan x="72" y="${firstBaseline + i * lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  const eyebrowMarkup = eyebrow
    ? `<text x="72" y="${firstBaseline - lineHeight - 26}" fill="${ACCENT}"
         font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
         font-size="24" font-weight="600" letter-spacing="2.5">${escapeXml(
           eyebrow.toUpperCase(),
         )}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${COVER_WIDTH}" height="${COVER_HEIGHT}" viewBox="0 0 ${COVER_WIDTH} ${COVER_HEIGHT}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.30"/>
      <stop offset="65%" stop-color="${ACCENT}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" fill="${INK}"/>
  <circle cx="${glowX}" cy="${glowY}" r="${glowR}" fill="url(#glow)"/>

  <!-- Brand lockup: mountain mark + wordmark -->
  <g transform="translate(72,64)">
    <rect width="40" height="40" rx="8" fill="#0d0d0d" stroke="#ffffff" stroke-opacity="0.15"/>
    <g transform="translate(8,8) scale(1.0)">
      <path d="M1.5 18.2 8.6 4.8a1 1 0 0 1 1.77 0l2.55 4.83 2.2-2.98a1 1 0 0 1 1.65.06L22.5 18.2H1.5Z" fill="${FOREGROUND}"/>
    </g>
    <text x="56" y="28" fill="${FOREGROUND}"
      font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
      font-size="24" font-weight="600">Denalix Tech</text>
  </g>

  ${eyebrowMarkup}

  <text fill="${FOREGROUND}"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
    font-size="${size}" font-weight="700" letter-spacing="-1">${titleTspans}</text>

  ${rule ? `<rect x="72" y="${COVER_HEIGHT - 104}" width="96" height="3" fill="${ACCENT}"/>` : ""}

  <text x="72" y="${COVER_HEIGHT - 52}" fill="${MUTED}"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
    font-size="22">denalixtech.com</text>
</svg>`;
}

export async function renderCoverPng(input: CoverInput): Promise<Buffer> {
  const svg = buildCoverSvg(input);
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

/** Alt text describing what the cover actually shows — not the article topic. */
export function coverAltText(title: string): string {
  return `Denalix Tech article cover with the title "${title}" on a dark background`;
}
