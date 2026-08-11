import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { CTASection } from "@/components/sections/CTASection";
import { ConsultationForm } from "@/components/contact/ConsultationForm";
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
 * This page now carries a form, reversing the earlier "no form, mailto only,
 * collects no personal data" decision. Two consequences kept deliberately:
 * the mailto address stays visible for anyone who would rather not fill in a
 * form, and the steps below still avoid promising a response time, which is not
 * ours to commit to on the company's behalf.
 */
const whatHappensNext = [
  {
    step: "1",
    title: "You describe the problem",
    description:
      "Tell us which workflow, system, or customer experience is causing friction — either through the form or by email. A few sentences is enough to start.",
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

        {/* The form the "Book a Consultation" CTAs lead to. `scroll-mt` keeps the
            heading clear of the fixed navbar when linked to with #consultation. */}
        <section id="consultation" className="container-px mx-auto mt-16 max-w-3xl scroll-mt-28">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold text-white">
              Book a consultation
            </h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
              Four short answers are enough. The two questions about your business
              are the ones that let us reply with something useful instead of asking
              you to explain it twice.
            </p>
          </Reveal>

          <Reveal>
            <div className="mt-8">
              <ConsultationForm />
            </div>
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
