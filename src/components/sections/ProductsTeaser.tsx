"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Bot, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { GlowButton } from "@/components/ui/GlowButton";
import { productsTeaser, productsPage } from "@/lib/site-config";

type Engine = { icon: LucideIcon; label: string; status: string };

const engines: Engine[] = [
  { icon: Search, label: "Google AI Overviews", status: "cited in the top answer" },
  { icon: Bot, label: "ChatGPT", status: "cited in 6 of 10 prompts" },
  { icon: Sparkles, label: "Perplexity", status: "cited in 4 of 10 prompts" },
  { icon: TrendingUp, label: "Google Search", status: "ranked #3 for target keywords" },
];

const ROTATE_MS = 2200;

export function ProductsTeaser() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % engines.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const Icon = engines[index].icon;

  return (
    <section id="products" className="relative py-28 sm:py-36">
      <div className="container-px mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {productsTeaser.eyebrow}
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="font-display mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                {productsTeaser.heading}
              </h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{productsTeaser.body}</p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-8">
                <GlowButton href={productsTeaser.href} variant="ghost">
                  {productsTeaser.cta}
                </GlowButton>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="relative rounded-md border border-white/12 bg-black/60 p-6 sm:p-8">
              <span className="inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white/70">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                {productsTeaser.status}
              </span>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                  Index — Visibility Scan
                </span>
                <span className="flex items-center gap-1.5 text-xs text-white/40">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  live
                </span>
              </div>

              <div className="mt-4 h-20 overflow-hidden rounded-sm border border-white/10 bg-white/[0.03] p-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="flex h-full flex-col justify-center gap-2"
                  >
                    <div className="flex items-center gap-2 font-mono text-xs text-white/50">
                      <Icon className="h-3.5 w-3.5" />
                      {engines[index].label}
                    </div>
                    <div className="font-mono text-sm text-white">✓ {engines[index].status}</div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {productsPage.product.metrics.map((m) => (
                  <div key={m.label} className="rounded-sm border border-white/10 bg-white/[0.03] p-3">
                    <div className="font-display text-xl font-semibold text-white">{m.value}</div>
                    <div className="mt-0.5 text-[11px] text-white/50">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
