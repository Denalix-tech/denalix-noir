import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlowButton } from "@/components/ui/GlowButton";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import BorderGlow from "@/components/ui/BorderGlow";
import { productsPage, site } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Products — Denalix Tech`,
  description: productsPage.body,
};

export default function ProductsPage() {
  const { product } = productsPage;

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-8">
        <section className="container-px mx-auto max-w-7xl">
          <SectionHeading
            eyebrow={productsPage.eyebrow}
            title={productsPage.heading}
            description={productsPage.body}
            align="center"
            className="mx-auto"
          />
        </section>

        <section className="container-px mx-auto mt-16 max-w-7xl sm:mt-20">
          <Reveal className="panel-strong grain relative isolate overflow-hidden rounded-md p-6 sm:p-10 lg:p-14">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f2b84b]" />
                  {product.status}
                </span>
                <h2 className="font-display mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  {product.name}
                </h2>
                <p className="mt-2 text-base font-medium text-white/70 sm:text-lg">{product.tagline}</p>
                <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">{product.description}</p>
                <div className="mt-8">
                  <GlowButton href={`mailto:${site.email}?subject=Index early access`}>{product.cta}</GlowButton>
                </div>
              </div>

              <div className="relative rounded-md border border-white/12 bg-black/60 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                    Index — Visibility Report
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-white/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f2b84b]" />
                    preview
                  </span>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {product.metrics.map((m) => (
                    <div key={m.label} className="rounded-sm border border-white/10 bg-white/[0.03] p-4">
                      <div className="font-display text-2xl font-semibold text-white">{m.value}</div>
                      <div className="mt-1 text-xs text-white/50">{m.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 space-y-2 rounded-sm border border-white/10 bg-white/[0.03] p-4 font-mono text-[11px] leading-relaxed text-white/60">
                  <div>$ index scan denalixtech.com</div>
                  <div className="text-white/40">→ checking AI Overviews, ChatGPT, Perplexity...</div>
                  <div className="text-white">✓ cited in 6 of 10 tracked prompts</div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="container-px mx-auto mt-24 max-w-7xl sm:mt-32">
          <SectionHeading
            eyebrow="What it does"
            title="Built for both kinds of search"
            description="Traditional rankings still matter. Now there is a second scoreboard: whether AI answer engines cite you at all. Index works both."
            align="center"
            className="mx-auto"
          />
          <RevealGroup className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {product.features.map((feature) => (
              <RevealItem key={feature.title} className="h-full">
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
                    <Check className="h-5 w-5 text-white" />
                    <h3 className="font-display mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{feature.description}</p>
                  </div>
                </BorderGlow>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        <section className="container-px mx-auto mt-24 max-w-3xl text-center sm:mt-32">
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">Want early access to Index?</h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            We are building Index alongside a small group of early partners. Reach out and we will let you know as
            soon as it is ready to try.
          </p>
          <div className="mt-8 flex justify-center">
            <GlowButton href={`mailto:${site.email}?subject=Index early access`}>{product.cta}</GlowButton>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
