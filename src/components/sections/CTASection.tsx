"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { site, finalCta } from "@/lib/site-config";
import { GlowButton } from "@/components/ui/GlowButton";
import { Reveal } from "@/components/ui/Reveal";
import { Mail } from "lucide-react";

/**
 * Static stand-in for the animated ring field. Doubles as the reduced-motion
 * treatment and as the placeholder while MagicRings loads, so the panel looks
 * designed at every stage rather than empty.
 */
function StaticGlow() {
  return (
    <div
      className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{ background: "radial-gradient(circle, rgba(242,184,75,0.22), transparent 70%)" }}
    />
  );
}

/** Static brand mark shown until the shader version is ready. */
function StaticMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true" focusable="false">
      <path
        d="M1.5 18.2 8.6 4.8a1 1 0 0 1 1.77 0l2.55 4.83 2.2-2.98a1 1 0 0 1 1.65.06L22.5 18.2H1.5Z"
        fill="#f5f5f5"
      />
    </svg>
  );
}

/*
 * These two are the heaviest client dependencies on the site — MagicRings
 * pulls in three.js, which was landing in the initial bundle of 11 of 14
 * prerendered routes because CTASection appears on nearly every page. Both are
 * purely decorative and sit behind -z-10, so deferring them costs nothing
 * visually and takes three.js off the critical path.
 */
const MagicRings = dynamic(() => import("@/components/effects/MagicRings"), {
  ssr: false,
  loading: () => <StaticGlow />,
});

const MetallicPaint = dynamic(() => import("@/components/effects/MetallicPaint"), {
  ssr: false,
  loading: () => <StaticMark />,
});

const statusLabels = [
  { text: "workflow automated", top: "8%", left: "6%", delay: "0s" },
  { text: "audit complete", top: "12%", left: "80%", delay: "1.4s" },
  { text: "client onboarded", top: "5%", left: "44%", delay: "2.8s" },
  { text: "system deployed", bottom: "10%", left: "9%", delay: "3.6s" },
  { text: "dashboard live", bottom: "14%", left: "78%", delay: "5.2s" },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const initialId = setTimeout(() => setReduced(mq.matches), 0);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => {
      clearTimeout(initialId);
      mq.removeEventListener("change", handler);
    };
  }, []);
  return reduced;
}

export function CTASection() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <section id="contact" className="relative py-24 sm:py-32">
      <div className="container-px mx-auto max-w-7xl">
        <Reveal>
          <div className="panel-strong grain relative isolate overflow-hidden rounded-md px-8 py-16 text-center sm:px-16 sm:py-24">
            <div className="pointer-events-none absolute inset-0 -z-10">
              {reducedMotion ? (
                <StaticGlow />
              ) : (
                <MagicRings
                  color="#f2b84b"
                  colorTwo="#ffd98a"
                  ringCount={5}
                  speed={0.5}
                  attenuation={12}
                  lineThickness={1.4}
                  baseRadius={0.22}
                  radiusStep={0.09}
                  scaleRate={0.14}
                  opacity={0.55}
                  blur={6}
                  noiseAmount={0.05}
                  ringGap={1.4}
                  fadeIn={0.6}
                  fadeOut={0.75}
                  hoverScale={1}
                  parallax={0}
                />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.15),rgba(0,0,0,0.35))]" />
            </div>

            <div className="pointer-events-none absolute inset-0 hidden sm:block">
              {statusLabels.map((label) => (
                <span
                  key={label.text}
                  className="label-fade absolute rounded-sm border border-white/12 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-white/50"
                  style={{
                    top: label.top,
                    bottom: label.bottom,
                    left: label.left,
                    animation: "label-fade 8s ease-in-out infinite",
                    animationDelay: label.delay,
                  }}
                >
                  {label.text}
                </span>
              ))}
            </div>

            <div className="mx-auto mb-6 h-24 w-24 sm:h-28 sm:w-28">
              <MetallicPaint
                imageSrc="/logo-metallic.svg"
                seed={7}
                scale={3}
                liquid={0.5}
                speed={0.25}
                brightness={1.6}
                contrast={0.6}
                refraction={0.012}
                blur={0.02}
                chromaticSpread={1.5}
                fresnel={1}
                lightColor="#ffffff"
                darkColor="#151515"
                tintColor="#ffffff"
              />
            </div>

            <span className="inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Limited engagements available this quarter
            </span>
            <h2 className="font-display mx-auto mt-6 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
              {finalCta.heading}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              {finalCta.body}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {/* The primary CTA now leads to the form; the address stays beside it
                  for anyone who would rather just send an email. */}
              <GlowButton href="/contact#consultation">{finalCta.cta}</GlowButton>
              <a
                href={`mailto:${site.email}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4" />
                {site.email}
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
