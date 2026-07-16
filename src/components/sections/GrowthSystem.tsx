"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Terminal, KanbanSquare, BarChart3 } from "lucide-react";
import { growthSystem } from "@/lib/site-config";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { RevealImage } from "@/components/ui/RevealImage";

const ROTATE_MS = 4500;

const demoMeta = [
  { icon: Terminal, blurb: "We map every manual handoff and duplicate entry point before writing a line of code." },
  { icon: KanbanSquare, blurb: "Findings become a staged roadmap — quick wins first, foundational systems next." },
  { icon: BarChart3, blurb: "We ship the system and wire it into a live dashboard your team actually uses." },
];

function AuditPanel() {
  const lines = [
    "$ denali scan ./operations",
    "  scanning workflows...",
    "> found 14 manual handoffs",
    "> found 3 duplicate data entry points",
    "> audit complete — 6.5 hrs/week recoverable",
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 rounded-md border border-white/12 bg-black/70 p-6 font-mono text-[13px] leading-relaxed text-white/70">
      {lines.map((line, i) => (
        <motion.div
          key={line}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.22, duration: 0.4 }}
          className={i === lines.length - 1 ? "text-white" : undefined}
        >
          {line}
        </motion.div>
      ))}
    </div>
  );
}

function RoadmapPanel() {
  const columns = [
    { label: "Now", items: ["Audit workflows"] },
    { label: "Next", items: ["Automate intake", "Connect CRM"] },
    { label: "Later", items: ["Reporting layer"] },
  ];
  return (
    <div className="grid h-full grid-cols-3 gap-3 rounded-md border border-white/12 bg-black/70 p-6">
      {columns.map((col, i) => (
        <motion.div
          key={col.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15, duration: 0.4 }}
          className="flex flex-col gap-2"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">{col.label}</span>
          {col.items.map((item) => (
            <div key={item} className="rounded-sm border border-white/12 bg-white/[0.04] p-2.5 text-xs text-white/85">
              {item}
            </div>
          ))}
        </motion.div>
      ))}
    </div>
  );
}

export function GrowthSystem() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setActive((prev) => (prev + 1) % growthSystem.steps.length), ROTATE_MS);
    return () => clearTimeout(id);
  }, [active]);

  return (
    <section id="growth-system" className="relative py-24 sm:py-32">
      <div className="container-px mx-auto max-w-7xl">
        <Reveal className="panel-strong grain relative isolate overflow-hidden rounded-md p-6 sm:p-10 lg:p-12">
          <div className="absolute inset-0 -z-10">
            <video
              autoPlay
              loop
              muted
              playsInline
              poster={growthSystem.image}
              className="h-full w-full object-cover opacity-[0.3] grayscale"
            >
              <source src="/videos/growth-system-terminal.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.3),rgba(0,0,0,0.6))]" />
          </div>
          <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {growthSystem.eyebrow}
              </span>
              <h2 className="font-display mt-4 text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
                {growthSystem.heading}
              </h2>

              <RevealGroup className="mt-8 grid grid-cols-2 gap-4 sm:gap-5">
                {growthSystem.benefits.map((benefit) => (
                  <RevealItem key={benefit}>
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
                      <span className="text-sm text-white/85">{benefit}</span>
                    </div>
                  </RevealItem>
                ))}
              </RevealGroup>

              <ul className="mt-10 flex flex-col gap-1 border-t border-white/15 pt-8">
                {growthSystem.steps.map((s, i) => {
                  const Icon = demoMeta[i].icon;
                  const isActive = i === active;
                  return (
                    <li key={s.step}>
                      <button
                        type="button"
                        onClick={() => setActive(i)}
                        className="group flex w-full items-start gap-3 rounded-sm py-2 text-left"
                      >
                        <Icon
                          className={`mt-0.5 h-4 w-4 shrink-0 transition-colors duration-300 ${
                            isActive ? "text-white" : "text-white/30"
                          }`}
                        />
                        <span className="flex-1">
                          <span
                            className={`font-display block text-sm font-semibold transition-colors duration-300 ${
                              isActive ? "text-white" : "text-white/40"
                            }`}
                          >
                            {s.step} · {s.title}
                          </span>
                          {isActive && (
                            <span className="block overflow-hidden pt-1 text-xs text-white/55">
                              {demoMeta[i].blurb}
                            </span>
                          )}
                          <span className="relative mt-2 block h-[2px] w-full overflow-hidden rounded-full bg-white/10">
                            {isActive && (
                              <span
                                key={active}
                                className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-white"
                                style={{ animation: `growth-progress ${ROTATE_MS}ms linear forwards` }}
                              />
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="relative h-72 sm:h-80">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0"
                >
                  {active === 0 && <AuditPanel />}
                  {active === 1 && <RoadmapPanel />}
                  {active === 2 && (
                    <div className="relative h-full">
                      <RevealImage
                        src={growthSystem.image}
                        alt="Live business operations dashboard showing analytics across the organization"
                        aspect="h-full"
                        className="h-full"
                      />
                      <div className="panel-strong absolute -top-4 left-4 inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs font-medium text-white shadow-lg sm:-left-4">
                        <span className="flex h-2 w-2 rounded-full bg-white" />
                        {growthSystem.status}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
