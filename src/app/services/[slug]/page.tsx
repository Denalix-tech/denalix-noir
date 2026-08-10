import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";

import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { CTASection } from "@/components/sections/CTASection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealImage } from "@/components/ui/RevealImage";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import BorderGlow from "@/components/ui/BorderGlow";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, serviceSchema } from "@/lib/schema";
import { getServiceLanding, serviceLandings } from "@/lib/services-data";
import { pageOpenGraph, pageTwitter } from "@/lib/seo";

type PageProps = { params: Promise<{ slug: string }> };

/** All five pages are known at build time, so they prerender as static HTML. */
export function generateStaticParams() {
  return serviceLandings.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceLanding(slug);

  if (!service) {
    return { title: "Service not found", robots: { index: false, follow: false } };
  }

  const path = `/services/${service.slug}`;

  return {
    // The root layout appends "| Denalix Tech" via the title template.
    title: service.metaTitle,
    description: service.metaDescription,
    alternates: { canonical: path },
    openGraph: pageOpenGraph({
      title: `${service.metaTitle} | Denalix Tech`,
      description: service.metaDescription,
      path,
    }),
    twitter: pageTwitter({
      title: `${service.metaTitle} | Denalix Tech`,
      description: service.metaDescription,
    }),
  };
}

export default async function ServiceLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const service = getServiceLanding(slug);

  if (!service) notFound();

  const path = `/services/${service.slug}`;

  const crumbs: BreadcrumbItem[] = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: service.name, path },
  ];

  const related = service.related
    .map((relatedSlug) => getServiceLanding(relatedSlug))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return (
    <>
      <Navbar />

      <JsonLd
        data={serviceSchema({
          name: service.name,
          description: service.schemaDescription,
          path,
        })}
      />
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <main className="flex-1 pt-28 pb-8">
        {/* Intro ------------------------------------------------------- */}
        <section className="container-px mx-auto max-w-7xl">
          <Breadcrumbs items={crumbs} />

          <div className="mt-8 grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <SectionHeading
              as="h1"
              eyebrow={service.eyebrow}
              title={service.h1}
              description={service.intro}
            />
            <RevealImage src={service.image} alt="" aspect="aspect-[4/3]" />
          </div>

          <Reveal>
            <p className="mt-10 max-w-3xl border-l-2 border-accent/50 pl-5 text-base leading-relaxed text-muted sm:text-lg">
              <span className="font-medium text-white">Who this is for: </span>
              {service.audience}
            </p>
          </Reveal>
        </section>

        {/* Problems ---------------------------------------------------- */}
        <section className="container-px mx-auto mt-24 max-w-7xl sm:mt-32">
          <SectionHeading eyebrow="The problem" title="Problems this service addresses" />

          <RevealGroup className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {service.problems.map((problem) => (
              <RevealItem key={problem}>
                <div className="panel h-full rounded-sm p-6">
                  <p className="text-sm leading-relaxed text-white/85">{problem}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* Deliverables ------------------------------------------------ */}
        <section className="container-px mx-auto mt-24 max-w-7xl sm:mt-32">
          <SectionHeading
            eyebrow="What we build"
            title="What Denalix Tech can build or improve"
          />

          <RevealGroup className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {service.deliverables.map((deliverable) => (
              <RevealItem key={deliverable.title} className="h-full">
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
                    <Check className="h-5 w-5 text-white" aria-hidden="true" />
                    <h3 className="font-display mt-4 text-lg font-semibold text-white">
                      {deliverable.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {deliverable.description}
                    </p>
                  </div>
                </BorderGlow>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* Engagement -------------------------------------------------- */}
        <section className="container-px mx-auto mt-24 max-w-7xl sm:mt-32">
          <SectionHeading
            eyebrow="Engagement"
            title="How the engagement works"
            description="Every project follows the same practical rhythm, scaled to the size of the problem."
          />

          <RevealGroup className="relative mt-12 space-y-8">
            <div className="absolute left-6 top-2 bottom-2 hidden w-px bg-white/15 sm:block" />
            {service.engagement.map((step) => (
              <RevealItem key={step.step}>
                <div className="relative flex gap-5">
                  <div className="panel relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold text-white">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                      {step.description}
                    </p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal>
            <Link
              href="/how-it-works"
              className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-white"
            >
              See the full process
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>
        </section>

        {/* Related ----------------------------------------------------- */}
        <section className="container-px mx-auto mt-24 max-w-7xl sm:mt-32">
          <SectionHeading eyebrow="Related services" title="Often combined with" />

          <RevealGroup className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {related.map((entry) => (
              <RevealItem key={entry.slug} className="h-full">
                <Link
                  href={`/services/${entry.slug}`}
                  className="panel group flex h-full flex-col rounded-sm p-6 transition-colors hover:border-white/40"
                >
                  <h3 className="font-display text-base font-semibold text-white">
                    <span className="underline-offset-4 group-hover:underline">{entry.name}</span>
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                    {entry.metaDescription}
                  </p>
                  <span className="mt-5 text-sm font-medium text-accent">Learn more →</span>
                </Link>
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
