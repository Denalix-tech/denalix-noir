import type { Metadata } from "next";
import { Sparkles, SearchCheck, Map, Compass, TrendingUp, Rocket, MapPin, type LucideIcon } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { CTASection } from "@/components/sections/CTASection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealImage } from "@/components/ui/RevealImage";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import BorderGlow from "@/components/ui/BorderGlow";
import { servicesPage, digitalizeFirst } from "@/lib/site-config";

const iconMap: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  "search-check": SearchCheck,
  map: Map,
  compass: Compass,
  "trending-up": TrendingUp,
  rocket: Rocket,
  "map-pin": MapPin,
};

export const metadata: Metadata = {
  title: `Services — Denalix Tech`,
  description: servicesPage.body,
};

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-8">
        <section className="container-px mx-auto max-w-7xl">
          <SectionHeading eyebrow={servicesPage.eyebrow} title={servicesPage.heading} description={servicesPage.body} />
        </section>

        <section className="container-px mx-auto mt-20 max-w-7xl space-y-20 sm:mt-28 sm:space-y-28">
          {servicesPage.pillars.map((pillar, i) => (
            <div key={pillar.title} className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                <RevealImage src={pillar.image} alt={pillar.title} aspect="aspect-[4/3]" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-semibold text-white sm:text-3xl">{pillar.title}</h3>
                <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{pillar.description}</p>
                <ul className="mt-6 space-y-3">
                  {pillar.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-sm text-white/85">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </section>

        <section className="container-px mx-auto mt-24 max-w-7xl sm:mt-32">
          <SectionHeading
            eyebrow="At a glance"
            title="Every service, in one place"
            align="center"
            className="mx-auto"
          />
          <RevealGroup className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
        </section>
      </main>
      <CTASection />
      <Footer />
    </>
  );
}
