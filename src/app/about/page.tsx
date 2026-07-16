import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { CTASection } from "@/components/sections/CTASection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealImage } from "@/components/ui/RevealImage";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import BorderGlow from "@/components/ui/BorderGlow";
import { aboutPage, whyDenalix } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `About — Denalix Tech`,
  description: aboutPage.body,
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-8">
        <section className="container-px mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <SectionHeading eyebrow={aboutPage.eyebrow} title={aboutPage.heading} description={aboutPage.body} />
            <RevealImage src={aboutPage.image} alt="The Denalix Tech team shaking hands after a partnership" aspect="aspect-[4/3]" />
          </div>
        </section>

        <section className="container-px mx-auto mt-24 max-w-7xl sm:mt-32">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="lg:order-2">
              <RevealImage
                src={aboutPage.mission.image}
                alt="Denalix Tech team presenting an operations roadmap"
                aspect="aspect-[4/3]"
              />
            </div>
            <div>
              <span className="inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {aboutPage.mission.eyebrow}
              </span>
              <h2 className="font-display mt-4 text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
                {aboutPage.mission.heading}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{aboutPage.mission.body}</p>
            </div>
          </div>
        </section>

        <section className="container-px mx-auto mt-24 max-w-7xl sm:mt-32">
          <SectionHeading
            eyebrow={whyDenalix.eyebrow}
            title={whyDenalix.heading}
            description={whyDenalix.body}
            align="center"
            className="mx-auto"
          />
          <RevealGroup className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {whyDenalix.points.map((point) => (
              <RevealItem key={point} className="h-full">
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
                  <div className="h-full p-6">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                    <p className="font-display mt-4 text-base font-semibold leading-snug text-white">{point}</p>
                  </div>
                </BorderGlow>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>
      </main>
      <CTASection />
      <Footer />
    </>
  );
}
