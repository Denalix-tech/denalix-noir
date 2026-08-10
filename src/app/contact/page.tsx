import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { CTASection } from "@/components/sections/CTASection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { site } from "@/lib/site-config";
import { pageOpenGraph, pageTwitter } from "@/lib/seo";

const DESCRIPTION =
  "Talk with Denalix Tech about AI automation, workflow improvements, dashboards, GIS, or custom software for your business.";

export const metadata: Metadata = {
  // Root layout appends "| Denalix Tech".
  title: "Book an AI & Software Consultation",
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: pageOpenGraph({
    title: "Book an AI & Software Consultation | Denalix Tech",
    description: DESCRIPTION,
    path: "/contact",
  }),
  twitter: pageTwitter({
    title: "Book an AI & Software Consultation | Denalix Tech",
    description: DESCRIPTION,
  }),
};

/**
 * Deliberately no form: this page keeps the existing mailto flow and collects
 * no personal data. The steps below describe the process without committing to
 * a response time, which is not ours to promise.
 */
const whatHappensNext = [
  {
    step: "1",
    title: "You describe the problem",
    description:
      "Tell us which workflow, system, or customer experience is causing friction. A few sentences is enough to start — there is no form to fill in.",
  },
  {
    step: "2",
    title: "We ask a few questions",
    description:
      "Usually by email first, so we understand how the work moves through your business today and where it slows down.",
  },
  {
    step: "3",
    title: "We suggest a practical next step",
    description:
      "That might be a short call, a closer look at one workflow, or an honest answer that this is not something we are the right fit for.",
  },
];

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-8">
        <section className="container-px mx-auto max-w-7xl">
          <SectionHeading
            as="h1"
            eyebrow="Contact"
            title="Tell us what is slowing your business down"
            description="Share the workflow, system, or customer experience you want to improve. We will use the first conversation to understand the problem and identify a practical next step."
          />

          <Reveal>
            <a
              href={`mailto:${site.email}`}
              className="mt-8 inline-flex items-center gap-2 text-base font-medium text-accent transition-colors hover:text-white"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {site.email}
            </a>
          </Reveal>
        </section>

        <section className="container-px mx-auto mt-20 max-w-7xl sm:mt-28">
          <SectionHeading
            eyebrow="What happens next"
            title="A short, practical first conversation"
            description="We keep the start of an engagement deliberately light. No pitch deck, no commitment, and no obligation to continue."
          />

          <RevealGroup className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {whatHappensNext.map((item) => (
              <RevealItem key={item.step} className="h-full">
                <div className="panel h-full rounded-sm p-6">
                  <div className="panel flex h-10 w-10 items-center justify-center rounded-full font-display text-sm font-semibold text-white">
                    {item.step}
                  </div>
                  <h3 className="font-display mt-4 text-base font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
                </div>
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
