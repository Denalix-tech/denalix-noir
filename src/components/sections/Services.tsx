import {
  Sparkles,
  SearchCheck,
  Map,
  Compass,
  TrendingUp,
  Rocket,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { digitalizeFirst } from "@/lib/site-config";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { RevealImage } from "@/components/ui/RevealImage";
import { GlowButton } from "@/components/ui/GlowButton";
import BorderGlow from "@/components/ui/BorderGlow";

const iconMap: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  "search-check": SearchCheck,
  map: Map,
  compass: Compass,
  "trending-up": TrendingUp,
  rocket: Rocket,
  "map-pin": MapPin,
};

export function Services() {
  return (
    <section id="services" className="relative py-28 sm:py-36">
      <div className="container-px mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {digitalizeFirst.eyebrow}
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="font-display mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                {digitalizeFirst.heading}
              </h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{digitalizeFirst.body}</p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-8">
                <GlowButton href={digitalizeFirst.cta.href} variant="ghost">
                  {digitalizeFirst.cta.label}
                </GlowButton>
              </div>
            </Reveal>
          </div>

          <RevealImage
            src={digitalizeFirst.image}
            alt="Team collaborating around laptops to plan a digital workflow"
          />
        </div>

        <RevealGroup className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {digitalizeFirst.items.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <RevealItem key={item.title} className="h-full">
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
                  <div className="h-full p-7">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-sm border border-white/15 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
                  </div>
                </BorderGlow>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
