import { whyDenalix } from "@/lib/site-config";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { RevealImage } from "@/components/ui/RevealImage";
import BorderGlow from "@/components/ui/BorderGlow";
import { CheckCircle2 } from "lucide-react";

export function Differentiators() {
  return (
    <section id="about" className="relative py-28 sm:py-36">
      <div className="container-px relative mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading
              eyebrow={whyDenalix.eyebrow}
              title={whyDenalix.heading}
              description={whyDenalix.body}
            />

            <RevealImage
              src={whyDenalix.image}
              alt="Two colleagues shaking hands after a successful project partnership"
              aspect="aspect-[16/10]"
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="mt-8"
            />
          </div>

          <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>
      </div>
    </section>
  );
}
