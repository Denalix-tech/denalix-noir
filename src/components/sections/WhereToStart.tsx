import Link from "next/link";
import { Layers, Route, BookOpen, Users, Building2, ArrowRight, type LucideIcon } from "lucide-react";
import { whereToStart } from "@/lib/site-config";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import BorderGlow from "@/components/ui/BorderGlow";
import DotField from "@/components/effects/DotField";

const iconMap: Record<string, LucideIcon> = {
  layers: Layers,
  route: Route,
  "book-open": BookOpen,
  users: Users,
  building: Building2,
};

export function WhereToStart() {
  return (
    <section id="where-to-start" className="relative overflow-hidden py-28 sm:py-36">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <DotField
          dotRadius={1.4}
          dotSpacing={28}
          bulgeStrength={55}
          cursorRadius={380}
          gradientFrom="rgba(255,255,255,0.14)"
          gradientTo="rgba(255,255,255,0.04)"
        />
      </div>
      <div className="container-px mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={whereToStart.eyebrow}
          title={whereToStart.heading}
          description={whereToStart.body}
        />

        <RevealGroup className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {whereToStart.paths.map((path, i) => {
            const Icon = iconMap[path.icon];
            return (
              <RevealItem key={path.label} className={i === 0 ? "h-full sm:col-span-2 lg:col-span-1" : "h-full"}>
                <Link href={path.href} className="block h-full">
                  <BorderGlow
                    className="h-full"
                    backgroundColor="var(--surface)"
                    borderRadius={8}
                    edgeSensitivity={35}
                    glowRadius={28}
                    glowIntensity={0.8}
                    coneSpread={30}
                    fillOpacity={0.3}
                    glowColor="0 0% 100%"
                    colors={["#ffffff", "#cfcfcf", "#8a8a8a"]}
                  >
                    <div className="group flex h-full flex-col p-6">
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-sm border border-white/15 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        {path.label}
                      </span>
                      <h3 className="font-display mt-2 text-base font-semibold leading-snug text-white">
                        {path.title}
                      </h3>
                      <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted">{path.description}</p>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors group-hover:text-white">
                        {path.cta}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </BorderGlow>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
