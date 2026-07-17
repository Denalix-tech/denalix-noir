import type { Metadata } from "next";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { CTASection } from "@/components/sections/CTASection";
import { site } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Contact — Denalix Tech`,
  description: `Get in touch with ${site.fullName} to talk about your business and book a consultation.`,
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-8">
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
