import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlowButton } from "@/components/ui/GlowButton";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import BorderGlow from "@/components/ui/BorderGlow";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { pricingPage } from "@/lib/pricing-data";
import { pageOpenGraph, pageTwitter } from "@/lib/seo";

const TITLE = "Pricing for Custom Software & AI Automation";
const DESCRIPTION =
  "What a Denalix Tech engagement costs: a fixed $500 discovery sprint, builds from $1,500 to $3,500, connected systems from $4,000 to $8,000, and ongoing operations partnerships from $9,000 or $1,500 a month.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: pageOpenGraph({
    title: `${TITLE} | Denalix Tech`,
    description: DESCRIPTION,
    path: "/pricing",
  }),
  twitter: pageTwitter({ title: `${TITLE} | Denalix Tech`, description: DESCRIPTION }),
};

/*
 * Deliberately no Offer or priceSpecification structured data.
 *
 * These are consulting engagements quoted within a range, not transactable
 * products at a fixed price. Price markup a visitor cannot act on at the stated
 * figure is a rich-results violation, and either end of a range rendered as a
 * hard price in a search result would misrepresent the offer. Breadcrumbs only.
 */
const crumbs: BreadcrumbItem[] = [
  { name: "Home", path: "/" },
  { name: "Pricing", path: "/pricing" },
];

export default function PricingPage() {
  const { tiers, drivers, excluded, faq } = pricingPage;

  return (
    <>
      <Navbar />
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <main className="flex-1 pt-28 pb-8">
        {/* Heading ------------------------------------------------------- */}
        <section className="container-px mx-auto max-w-7xl">
          <Breadcrumbs items={crumbs} />

          <div className="mt-8">
            <SectionHeading
              as="h1"
              eyebrow={pricingPage.eyebrow}
              title={pricingPage.heading}
              description={pricingPage.body}
              align="center"
              className="mx-auto"
            />
          </div>

          <Reveal delay={0.16}>
            <p className="mx-auto mt-6 text-center text-sm text-muted-soft">
              {pricingPage.currencyNote}
            </p>
          </Reveal>
        </section>

        {/* Tiers --------------------------------------------------------- */}
        <section className="container-px mx-auto mt-16 max-w-7xl sm:mt-20">
          <RevealGroup className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {tiers.map((tier) => (
              <RevealItem key={tier.id} className="h-full">
                <BorderGlow
                  className="h-full"
                  backgroundColor="var(--surface)"
                  borderRadius={8}
                  edgeSensitivity={35}
                  glowRadius={28}
                  glowIntensity={tier.featured ? 1 : 0.8}
                  coneSpread={30}
                  fillOpacity={0.3}
                  glowColor={tier.featured ? "39 86% 62%" : "0 0% 100%"}
                  colors={
                    tier.featured
                      ? ["#f2b84b", "#c9922b", "#8a6318"]
                      : ["#ffffff", "#cfcfcf", "#8a8a8a"]
                  }
                >
                  <article
                    id={tier.id}
                    className="flex h-full flex-col p-6 sm:p-8"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        {tier.eyebrow}
                      </span>
                      {tier.featured && (
                        <span className="inline-flex items-center gap-2 rounded-sm border border-[#f2b84b]/40 bg-[#f2b84b]/10 px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[#f2b84b]">
                          Most common
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 font-display text-2xl font-semibold text-white">
                      {tier.name}
                    </h2>

                    <p className="mt-5 font-display text-4xl font-semibold tracking-tight text-white tabular-nums">
                      {tier.price}
                    </p>
                    <p className="mt-2 text-sm text-muted">{tier.priceNote}</p>

                    <p className="mt-6 border-t border-white/10 pt-6 text-sm leading-relaxed text-muted">
                      <span className="font-medium text-white">Best for </span>
                      {tier.bestFor}
                    </p>

                    <ul className="mt-6 flex flex-1 flex-col gap-3">
                      {tier.includes.map((item) => (
                        <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
                          <Check
                            aria-hidden="true"
                            className="mt-0.5 h-4 w-4 flex-none text-[#f2b84b]"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8">
                      <GlowButton href={tier.cta.href}>{tier.cta.label}</GlowButton>
                    </div>
                  </article>
                </BorderGlow>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* What moves the number ---------------------------------------- */}
        <section className="container-px mx-auto mt-24 max-w-7xl sm:mt-32">
          <SectionHeading
            eyebrow={drivers.eyebrow}
            title={drivers.heading}
            description={drivers.body}
          />

          <RevealGroup className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {drivers.items.map((item) => (
              <RevealItem key={item.title} className="h-full">
                <div className="flex h-full flex-col rounded-md border border-white/10 bg-surface/60 p-6">
                  <h3 className="font-display text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* Not included -------------------------------------------------- */}
        <section className="container-px mx-auto mt-24 max-w-7xl sm:mt-32">
          <Reveal className="panel-strong grain relative isolate overflow-hidden rounded-md p-6 sm:p-10 lg:p-14">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
              <div>
                <span className="inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white">
                  {excluded.eyebrow}
                </span>
                <h2 className="mt-4 font-display text-2xl font-semibold leading-tight text-white sm:text-3xl">
                  {excluded.heading}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted">{excluded.body}</p>
              </div>

              <ul className="flex flex-col gap-4">
                {excluded.items.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 border-b border-white/10 pb-4 text-sm leading-relaxed text-muted last:border-b-0 last:pb-0"
                  >
                    <span aria-hidden="true" className="mt-2 h-1 w-1 flex-none rounded-full bg-muted-soft" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* FAQ ----------------------------------------------------------- */}
        <section className="container-px mx-auto mt-24 max-w-7xl sm:mt-32">
          <SectionHeading eyebrow={faq.eyebrow} title={faq.heading} />

          <RevealGroup className="mt-12 grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-2">
            {faq.items.map((item) => (
              <RevealItem key={item.question}>
                <h3 className="font-display text-lg font-semibold text-white">{item.question}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.answer}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* Close --------------------------------------------------------- */}
        <section className="container-px mx-auto mt-24 max-w-7xl sm:mt-32">
          <Reveal className="rounded-md border border-white/10 bg-surface/60 p-8 text-center sm:p-12">
            <h2 className="font-display text-2xl font-semibold leading-tight text-white sm:text-3xl">
              Not sure which one you need?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
              Describe the process that is costing you the most time. We will tell you which tier it
              falls into, or that it does not need us at all.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <GlowButton href="/contact">Book a consultation</GlowButton>
              <Link
                href="/services"
                className="group inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-white"
              >
                See what we build
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
