import clsx from "clsx";

/**
 * Brand mark.
 *
 * Deliberately a static inline SVG rather than the animated `MetallicPaint`
 * shader: this renders inside `Navbar` and `Footer`, so the WebGL version
 * spun up a canvas and pulled the shader code into the critical path of every
 * page on the site. The animated treatment is kept where it earns its cost —
 * the large mark in `CTASection` — and is loaded lazily there.
 *
 * No gradient `<defs>`: several Logos render per page, and duplicated SVG ids
 * are invalid. At 32px a flat fill is indistinguishable anyway.
 *
 * Decorative — every usage sits beside the visible "Denalix" wordmark.
 */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      className={clsx(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-black p-0.5",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M1.5 18.2 8.6 4.8a1 1 0 0 1 1.77 0l2.55 4.83 2.2-2.98a1 1 0 0 1 1.65.06L22.5 18.2H1.5Z"
          fill="#f5f5f5"
        />
      </svg>
    </span>
  );
}
