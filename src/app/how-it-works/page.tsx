import type { Metadata } from "next";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { CTASection } from "@/components/sections/CTASection";
import { OperationDiagram } from "@/components/sections/OperationDiagram";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealGroup, RevealItem, Reveal } from "@/components/ui/Reveal";
import { RevealImage } from "@/components/ui/RevealImage";
import { howItWorks } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `How It Works — Denalix Tech`,
  description: howItWorks.body,
};

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-8">
        <section className="container-px mx-auto max-w-7xl">
          <SectionHeading
            eyebrow={howItWorks.eyebrow}
            title={howItWorks.heading}
            description={howItWorks.body}
            align="center"
            className="mx-auto"
          />

          <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <RevealGroup className="relative space-y-8">
              <div className="absolute left-6 top-2 bottom-2 hidden w-px bg-white/15 sm:block" />
              {howItWorks.steps.map((item) => (
                <RevealItem key={item.step}>
                  <div className="relative flex gap-5 sm:pl-0">
                    <div className="panel relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold text-white">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{item.description}</p>
                    </div>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>

            <RevealImage
              src={howItWorks.image}
              alt="Team mapping out a project roadmap with sticky notes on a whiteboard"
              aspect="h-full min-h-[320px]"
              className="h-full"
            />
          </div>
        </section>

        <section className="container-px mx-auto mt-24 max-w-7xl sm:mt-32">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-2xl font-semibold leading-tight text-white sm:text-3xl">
                One timeline, from first call to a live system
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">
                Every engagement follows the same operating rhythm — one stage at a time, from the first
                conversation to a system your team runs on every day.
              </p>
            </div>
          </Reveal>

          <div className="mt-16 sm:mt-20">
            <OperationDiagram />
          </div>
        </section>
      </main>
      <CTASection />
      <Footer />
    </>
  );
}
