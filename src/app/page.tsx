import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";
import { AudienceGrid } from "@/components/sections/AudienceGrid";
import { GrowthSystem } from "@/components/sections/GrowthSystem";
import { Services } from "@/components/sections/Services";
import { ProductsTeaser } from "@/components/sections/ProductsTeaser";
import { WhereToStart } from "@/components/sections/WhereToStart";
import { Differentiators } from "@/components/sections/Differentiators";
import { Process } from "@/components/sections/Process";
import { CTASection } from "@/components/sections/CTASection";
import { Footer } from "@/components/sections/Footer";
import { ScrollSpyNav } from "@/components/ui/ScrollSpyNav";

export default function Home() {
  return (
    <>
      <Navbar />
      <div className="flex flex-1 flex-col">
        <Hero />
        <div className="mx-auto flex w-full max-w-[1400px] flex-1 xl:px-6">
          <div className="hidden shrink-0 xl:block xl:w-40">
            <ScrollSpyNav />
          </div>
          <main className="min-w-0 flex-1">
            <AudienceGrid />
            <GrowthSystem />
            <Services />
            <Process />
            <ProductsTeaser />
            <WhereToStart />
            <Differentiators />
            <CTASection />
          </main>
        </div>
        <Footer />
      </div>
    </>
  );
}
