"use client";

import { motion } from "framer-motion";
import { Rocket, Building2, HeartPulse, Store } from "lucide-react";
import { GlowButton } from "@/components/ui/GlowButton";
import { ParticleNetwork } from "@/components/effects/ParticleNetwork";
import DotField from "@/components/effects/DotField";
import SplitText from "@/components/text/SplitText";
import BlurText from "@/components/text/BlurText";
import TextType from "@/components/text/TextType";
import { hero } from "@/lib/site-config";

const audiences = [
  { icon: Rocket, label: "Startups" },
  { icon: Store, label: "Local Businesses" },
  { icon: HeartPulse, label: "Healthcare Teams" },
  { icon: Building2, label: "Growing Companies" },
];

export function Hero() {
  return (
    <section id="top" className="relative isolate flex min-h-[100svh] items-center overflow-hidden pt-28 pb-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <DotField
          dotRadius={1.5}
          dotSpacing={24}
          bulgeStrength={70}
          cursorRadius={460}
          waveAmplitude={0.6}
          gradientFrom="rgba(255, 255, 255, 0.38)"
          gradientTo="rgba(255,255,255,0.05)"
        />
      </div>
      <ParticleNetwork className="absolute inset-0 -z-10 opacity-50" />

      <div className="container-px mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mb-8 inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <TextType
              text="Now booking new engagements"
              as="span"
              typingSpeed={35}
              initialDelay={400}
              loop={false}
              cursorCharacter="_"
              className="text-xs font-medium"
            />
          </motion.div>

          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
            <SplitText
              text="Modernize. Automate."
              tag="span"
              splitType="words"
              duration={0.9}
              delay={60}
              textAlign="center"
              className="text-white"
            />
            <br />
            <SplitText
              text="Scale with confidence."
              tag="span"
              splitType="words"
              duration={0.9}
              delay={60}
              rootMargin="-60px"
              textAlign="center"
              className="text-white/45"
            />
          </h1>

          <BlurText
            text={hero.body}
            animateBy="words"
            direction="top"
            delay={18}
            stepDuration={0.3}
            className="mx-auto mt-7 max-w-2xl justify-center text-balance text-lg leading-relaxed text-muted sm:text-xl"
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <GlowButton href="/#contact">{hero.primaryCta}</GlowButton>
            <GlowButton href="/#how-it-works" variant="ghost">
              {hero.secondaryCta}
            </GlowButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.75, delay: 0.4 }}
            className="mx-auto mt-16 flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-4"
          >
            {audiences.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-muted-soft">
                <Icon className="h-4 w-4 text-white/70" />
                {label}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent" />
    </section>
  );
}
