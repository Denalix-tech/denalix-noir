/**
 * Per-site brand tokens for cover generation.
 *
 * These were module constants inside `cover-image.ts`, which burned one site's
 * palette, wordmark, and domain into every cover it rendered. They are data now,
 * so a cover can be rendered in whichever site's system it belongs to.
 *
 * Design constants that are not brand decisions — the 1200x630 canvas, the 72px
 * gutter, the type scale, the glow geometry — deliberately stay in
 * `cover-image.ts`. Only things that legitimately differ between brands live here.
 */
export type Brand = {
  /** Canvas background. */
  ink: string;
  /** Title text and wordmark. */
  foreground: string;
  /** The footer domain line. */
  muted: string;
  /** Eyebrow, corner glow, and the short rule above the footer. */
  accent: string;
  /** Chip behind the logo glyph. */
  markChip: string;
  /** Hairline around the chip, drawn at low opacity. */
  markStroke: string;
  /** Rendered beside the glyph, e.g. "Denalix Tech". */
  wordmark: string;
  /** Footer line, e.g. "denalixtech.com". */
  domain: string;
  /** SVG path for the logo glyph, authored against a 24x24 viewport. */
  markPath: string;
};

export const DENALIX_BRAND: Brand = {
  ink: "#000000",
  foreground: "#f5f5f5",
  muted: "#9a9a9a",
  accent: "#f2b84b",
  markChip: "#0d0d0d",
  markStroke: "#ffffff",
  wordmark: "Denalix Tech",
  domain: "denalixtech.com",
  markPath:
    "M1.5 18.2 8.6 4.8a1 1 0 0 1 1.77 0l2.55 4.83 2.2-2.98a1 1 0 0 1 1.65.06L22.5 18.2H1.5Z",
};
