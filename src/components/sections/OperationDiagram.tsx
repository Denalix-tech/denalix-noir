"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { MessageSquare, Search, Map, Zap, LifeBuoy, Database, type LucideIcon } from "lucide-react";

type StageDef = {
  key: string;
  label: string;
  timestamp: string;
  icon: LucideIcon;
  ongoing?: boolean;
};

const stageDefs: StageDef[] = [
  { key: "intake", label: "Intake", timestamp: "Week 1", icon: MessageSquare },
  { key: "audit", label: "Audit", timestamp: "Week 2", icon: Search },
  { key: "roadmap", label: "Roadmap", timestamp: "Week 3", icon: Map },
  { key: "automate", label: "Automate", timestamp: "Week 4-6", icon: Zap },
  { key: "support", label: "Support", timestamp: "Ongoing", icon: LifeBuoy, ongoing: true },
];

type NodeState = "pending" | "active" | "done";

function stateFor(i: number, activeIndex: number): NodeState {
  if (i < activeIndex) return "done";
  if (i === activeIndex) return "active";
  return "pending";
}

// One stage lights up at a time (active + glowing); every other stage — its path
// and its icon — sits dimmed until the sequence reaches it, matching a single
// moving point of focus that travels the length of the diagram and loops.
function useStageSequencer(stageCount: number, stageMs: number, pauseMs: number) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3 });
  const [cycle, setCycle] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!isInView) return;
    let cancelled = false;
    let idx = -1;
    let timeoutId: ReturnType<typeof setTimeout>;

    const step = () => {
      if (cancelled) return;
      idx += 1;
      if (idx >= stageCount) {
        timeoutId = setTimeout(() => {
          if (cancelled) return;
          idx = -1;
          setActiveIndex(-1);
          setCycle((c) => c + 1);
          timeoutId = setTimeout(step, stageMs);
        }, pauseMs);
        return;
      }
      setActiveIndex(idx);
      timeoutId = setTimeout(step, stageMs);
    };

    timeoutId = setTimeout(step, 500);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isInView, stageCount, stageMs, pauseMs]);

  return { ref, cycle, activeIndex };
}

// ---------- vertical (mobile) layout — the same trunk-and-branch diagram as the
// desktop version below, just rotated: trunk runs top-to-bottom, branches alternate
// left/right instead of up/down. ----------

const V_VW = 300;
const V_VH = 660;
const V_TRUNK_X = 150;
const V_TRUNK_START = 30;
const V_BRANCH_START = 170;
const V_BRANCH_GAP = 90;
const V_ICON_OFFSET = 56;
const V_STAGE_MS = 1050;
const V_PAUSE_MS = 1300;

const vStages = stageDefs.map((s, i) => ({
  ...s,
  y: V_BRANCH_START + i * V_BRANCH_GAP,
  left: i % 2 === 0,
}));

const vLastStage = vStages[vStages.length - 1];
const V_TRUNK_SOLID_END = vLastStage.y + 40;
const V_TRUNK_END = V_TRUNK_SOLID_END + 50;

function VerticalDiagram() {
  const { ref, cycle, activeIndex } = useStageSequencer(vStages.length, V_STAGE_MS, V_PAUSE_MS);
  const tailRevealed = activeIndex >= vStages.length - 1;

  return (
    <div ref={ref} className="relative mx-auto max-w-xs rounded-md border border-white/10 bg-black/40 p-3">
      <div className="relative w-full" style={{ aspectRatio: `${V_VW} / ${V_VH}` }}>
        <svg viewBox={`0 0 ${V_VW} ${V_VH}`} className="absolute inset-0 h-full w-full overflow-visible">
          <g opacity={0.25}>
            {Array.from({ length: Math.ceil(V_VH / 45) }, (_, i) => (
              <line key={i} x1={10} y1={i * 45} x2={V_VW - 10} y2={i * 45} stroke="white" strokeWidth={1} strokeDasharray="1 8" />
            ))}
          </g>
          <path
            d={`M ${V_TRUNK_X} ${V_TRUNK_START} V ${V_TRUNK_END}`}
            stroke="white"
            strokeOpacity={0.06}
            strokeWidth={2}
          />

          <g key={cycle}>
            {vStages.map((s, i) => {
              const state = stateFor(i, activeIndex);
              const isActive = state === "active";
              const isDone = state === "done";
              const drawDuration = isActive ? (V_STAGE_MS / 1000) * 0.55 : 0.35;
              const segY1 = i === 0 ? V_TRUNK_START : vStages[i - 1].y;
              const iconX = s.left ? V_TRUNK_X - V_ICON_OFFSET : V_TRUNK_X + V_ICON_OFFSET;
              return (
                <g key={s.key}>
                  <motion.line
                    x1={V_TRUNK_X}
                    y1={segY1}
                    x2={V_TRUNK_X}
                    y2={s.y}
                    stroke="#f2b84b"
                    strokeWidth={6}
                    style={{ filter: "blur(6px)" }}
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ opacity: isActive ? 0.85 : 0, pathLength: isActive || isDone ? 1 : 0 }}
                    transition={{ duration: drawDuration, ease: "easeInOut" }}
                  />
                  <motion.line
                    x1={V_TRUNK_X}
                    y1={segY1}
                    x2={V_TRUNK_X}
                    y2={s.y}
                    initial={{ pathLength: 0 }}
                    animate={{
                      pathLength: isActive || isDone ? 1 : 0,
                      stroke: isActive ? "#ffffff" : "rgba(255,255,255,0.32)",
                      strokeWidth: isActive ? 3 : 2,
                    }}
                    transition={{ duration: drawDuration, ease: "easeInOut" }}
                  />

                  <motion.circle
                    cx={V_TRUNK_X}
                    cy={s.y}
                    r={3.5}
                    initial={{ scale: 0 }}
                    animate={{
                      scale: isActive || isDone ? 1 : 0,
                      fill: isActive ? "#f2b84b" : "rgba(255,255,255,0.4)",
                    }}
                    transition={{ duration: 0.3 }}
                  />

                  <motion.line
                    x1={V_TRUNK_X}
                    y1={s.y}
                    x2={iconX}
                    y2={s.y}
                    stroke="#f2b84b"
                    strokeWidth={4}
                    style={{ filter: "blur(5px)" }}
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ opacity: isActive ? 0.85 : 0, pathLength: isActive || isDone ? 1 : 0 }}
                    transition={{ duration: drawDuration, ease: "easeInOut" }}
                  />
                  <motion.line
                    x1={V_TRUNK_X}
                    y1={s.y}
                    x2={iconX}
                    y2={s.y}
                    strokeDasharray="3 4"
                    initial={{ pathLength: 0 }}
                    animate={{
                      pathLength: isActive || isDone ? 1 : 0,
                      stroke: isActive ? "#ffffff" : "rgba(255,255,255,0.3)",
                      strokeWidth: isActive ? 2 : 1.5,
                    }}
                    transition={{ duration: drawDuration, ease: "easeInOut" }}
                  />
                </g>
              );
            })}

            <motion.line
              x1={V_TRUNK_X}
              y1={V_TRUNK_SOLID_END}
              x2={V_TRUNK_X}
              y2={V_TRUNK_END}
              stroke="rgba(242,184,75,0.75)"
              strokeWidth={2}
              strokeDasharray="3 5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: tailRevealed ? 1 : 0, opacity: tailRevealed ? 1 : 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            />
            <motion.circle
              cx={V_TRUNK_X}
              cy={V_TRUNK_END}
              r={5}
              fill="#f2b84b"
              initial={{ scale: 0 }}
              animate={{ scale: tailRevealed ? [0, 1.4, 1] : 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              {tailRevealed && (
                <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" begin="1.3s" repeatCount="indefinite" />
              )}
            </motion.circle>
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(V_TRUNK_X / V_VW) * 100}%`, top: `${(150 / V_VH) * 100}%` }}
          >
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black">
              <Database className="h-3 w-3" />
              Operation
            </span>
          </div>

          {vStages.map((s, i) => {
            const state = stateFor(i, activeIndex);
            const Icon = s.icon;
            const iconX = s.left ? V_TRUNK_X - V_ICON_OFFSET : V_TRUNK_X + V_ICON_OFFSET;
            const leftPct = (iconX / V_VW) * 100;
            const topPct = (s.y / V_VH) * 100;
            return (
              <div key={s.key} className="absolute" style={{ left: `${leftPct}%`, top: `${topPct}%` }}>
                <div className="relative -translate-x-1/2 -translate-y-1/2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border bg-black transition-all duration-300 ${
                      state === "pending"
                        ? "scale-75 border-white/10 opacity-30"
                        : state === "active"
                          ? "scale-110 border-accent opacity-100 shadow-[0_0_16px_rgba(242,184,75,0.7)]"
                          : "scale-100 border-white/25 opacity-100"
                    }`}
                  >
                    <Icon
                      className="h-4 w-4"
                      color={
                        state === "active"
                          ? "#f2b84b"
                          : state === "done"
                            ? "rgba(255,255,255,0.75)"
                            : "rgba(255,255,255,0.25)"
                      }
                    />
                  </div>
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-center transition-opacity duration-300 ${
                      s.left ? "right-full mr-1.5" : "left-full ml-1.5"
                    } ${state === "pending" ? "opacity-0" : "opacity-100"}`}
                  >
                    <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-black">
                      {s.label}
                    </span>
                    <div className="mt-0.5 text-[8px] text-white/40">{s.timestamp}</div>
                  </div>
                </div>
              </div>
            );
          })}

          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(V_TRUNK_X / V_VW) * 100}%`, top: `${(V_TRUNK_END / V_VH) * 100}%` }}
          >
            <div
              className={`absolute left-full top-1/2 ml-1.5 -translate-y-1/2 whitespace-nowrap text-center transition-opacity duration-300 ${
                tailRevealed ? "opacity-100" : "opacity-0"
              }`}
            >
              <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-black">
                Ongoing
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- horizontal (tablet/desktop) layout — neon.com-style branch diagram ----------

const H_VW = 1060;
const H_VH = 420;
const H_TRUNK_Y = 210;
const H_TRUNK_START = 40;
const H_BRANCH_START = 300;
const H_BRANCH_GAP = 160;
const H_ICON_OFFSET = 95;
const H_STAGE_MS = 1800;
const H_PAUSE_MS = 2200;

const hStages = stageDefs.map((s, i) => ({
  ...s,
  x: H_BRANCH_START + i * H_BRANCH_GAP,
  up: i % 2 === 0,
}));

const hLastStage = hStages[hStages.length - 1];
const H_TRUNK_SOLID_END = hLastStage.x + 40;
const H_TRUNK_END = H_TRUNK_SOLID_END + 50;

function HorizontalDiagram() {
  const { ref, cycle, activeIndex } = useStageSequencer(hStages.length, H_STAGE_MS, H_PAUSE_MS);
  const tailRevealed = activeIndex >= hStages.length - 1;

  return (
    <div ref={ref} className="relative mx-auto max-w-4xl rounded-md border border-white/10 bg-black/40 p-6 sm:p-10">
      <div className="relative w-full" style={{ aspectRatio: `${H_VW} / ${H_VH}` }}>
        <svg viewBox={`0 0 ${H_VW} ${H_VH}`} className="absolute inset-0 h-full w-full overflow-visible">
          <g opacity={0.25}>
            {Array.from({ length: Math.ceil(H_VW / 45) }, (_, i) => (
              <line key={i} x1={i * 45} y1={10} x2={i * 45} y2={H_VH - 10} stroke="white" strokeWidth={1} strokeDasharray="1 8" />
            ))}
          </g>
          <path
            d={`M ${H_TRUNK_START} ${H_TRUNK_Y} H ${H_TRUNK_END}`}
            stroke="white"
            strokeOpacity={0.06}
            strokeWidth={2}
          />

          <g key={cycle}>
            {hStages.map((s, i) => {
              const state = stateFor(i, activeIndex);
              const isActive = state === "active";
              const isDone = state === "done";
              const drawDuration = isActive ? (H_STAGE_MS / 1000) * 0.55 : 0.6;
              const segX1 = i === 0 ? H_TRUNK_START : hStages[i - 1].x;
              const iconY = s.up ? H_TRUNK_Y - H_ICON_OFFSET : H_TRUNK_Y + H_ICON_OFFSET;
              return (
                <g key={s.key}>
                  <motion.line
                    x1={segX1}
                    y1={H_TRUNK_Y}
                    x2={s.x}
                    y2={H_TRUNK_Y}
                    stroke="#f2b84b"
                    strokeWidth={6}
                    style={{ filter: "blur(6px)" }}
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ opacity: isActive ? 0.85 : 0, pathLength: isActive || isDone ? 1 : 0 }}
                    transition={{ duration: drawDuration, ease: "easeInOut" }}
                  />
                  <motion.line
                    x1={segX1}
                    y1={H_TRUNK_Y}
                    x2={s.x}
                    y2={H_TRUNK_Y}
                    initial={{ pathLength: 0 }}
                    animate={{
                      pathLength: isActive || isDone ? 1 : 0,
                      stroke: isActive ? "#ffffff" : "rgba(255,255,255,0.32)",
                      strokeWidth: isActive ? 3 : 2,
                    }}
                    transition={{ duration: drawDuration, ease: "easeInOut" }}
                  />

                  <motion.circle
                    cx={s.x}
                    cy={H_TRUNK_Y}
                    r={3.5}
                    initial={{ scale: 0 }}
                    animate={{
                      scale: isActive || isDone ? 1 : 0,
                      fill: isActive ? "#f2b84b" : "rgba(255,255,255,0.4)",
                    }}
                    transition={{ duration: 0.3 }}
                  />

                  <motion.line
                    x1={s.x}
                    y1={H_TRUNK_Y}
                    x2={s.x}
                    y2={iconY}
                    stroke="#f2b84b"
                    strokeWidth={4}
                    style={{ filter: "blur(5px)" }}
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ opacity: isActive ? 0.85 : 0, pathLength: isActive || isDone ? 1 : 0 }}
                    transition={{ duration: drawDuration, ease: "easeInOut" }}
                  />
                  <motion.line
                    x1={s.x}
                    y1={H_TRUNK_Y}
                    x2={s.x}
                    y2={iconY}
                    strokeDasharray="3 4"
                    initial={{ pathLength: 0 }}
                    animate={{
                      pathLength: isActive || isDone ? 1 : 0,
                      stroke: isActive ? "#ffffff" : "rgba(255,255,255,0.3)",
                      strokeWidth: isActive ? 2 : 1.5,
                    }}
                    transition={{ duration: drawDuration, ease: "easeInOut" }}
                  />
                </g>
              );
            })}

            <motion.line
              x1={H_TRUNK_SOLID_END}
              y1={H_TRUNK_Y}
              x2={H_TRUNK_END}
              y2={H_TRUNK_Y}
              stroke="rgba(242,184,75,0.75)"
              strokeWidth={2}
              strokeDasharray="3 5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: tailRevealed ? 1 : 0, opacity: tailRevealed ? 1 : 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            />
            <motion.circle
              cx={H_TRUNK_END}
              cy={H_TRUNK_Y}
              r={5}
              fill="#f2b84b"
              initial={{ scale: 0 }}
              animate={{ scale: tailRevealed ? [0, 1.4, 1] : 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              {tailRevealed && (
                <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" begin="1.3s" repeatCount="indefinite" />
              )}
            </motion.circle>
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(150 / H_VW) * 100}%`, top: `${(H_TRUNK_Y / H_VH) * 100}%` }}
          >
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black sm:text-sm">
              <Database className="h-3.5 w-3.5" />
              Operation
            </span>
          </div>

          {hStages.map((s, i) => {
            const state = stateFor(i, activeIndex);
            const Icon = s.icon;
            const iconY = s.up ? H_TRUNK_Y - H_ICON_OFFSET : H_TRUNK_Y + H_ICON_OFFSET;
            const leftPct = (s.x / H_VW) * 100;
            const topPct = (iconY / H_VH) * 100;
            return (
              <div key={s.key} className="absolute" style={{ left: `${leftPct}%`, top: `${topPct}%` }}>
                <div className="relative -translate-x-1/2 -translate-y-1/2">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full border bg-black transition-all duration-500 sm:h-12 sm:w-12 ${
                      state === "pending"
                        ? "scale-75 border-white/10 opacity-30"
                        : state === "active"
                          ? "scale-110 border-accent opacity-100 shadow-[0_0_16px_rgba(242,184,75,0.7)]"
                          : "scale-100 border-white/25 opacity-100"
                    }`}
                  >
                    <Icon
                      className="h-5 w-5 sm:h-6 sm:w-6"
                      color={
                        state === "active"
                          ? "#f2b84b"
                          : state === "done"
                            ? "rgba(255,255,255,0.75)"
                            : "rgba(255,255,255,0.25)"
                      }
                    />
                  </div>
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center transition-opacity duration-500 ${
                      s.up ? "bottom-full mb-2" : "top-full mt-2"
                    } ${state === "pending" ? "opacity-0" : "opacity-100"}`}
                  >
                    <span className="inline-block rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black sm:text-sm">
                      {s.label}
                    </span>
                    <div className="mt-1 text-[10px] text-white/40 sm:text-[11px]">{s.timestamp}</div>
                  </div>
                </div>
              </div>
            );
          })}

          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(H_TRUNK_END / H_VW) * 100}%`, top: `${(H_TRUNK_Y / H_VH) * 100}%` }}
          >
            <div
              className={`absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap text-center transition-opacity duration-500 ${
                tailRevealed ? "opacity-100" : "opacity-0"
              }`}
            >
              <span className="inline-block rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black sm:text-sm">
                Ongoing
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OperationDiagram() {
  return (
    <>
      <div className="md:hidden">
        <VerticalDiagram />
      </div>
      <div className="hidden md:block">
        <HorizontalDiagram />
      </div>
    </>
  );
}
