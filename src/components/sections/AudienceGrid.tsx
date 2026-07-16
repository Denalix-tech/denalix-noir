"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { audiences } from "@/lib/site-config";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";

export function AudienceGrid() {
  return (
    <section className="relative pb-24 sm:pb-32">
      <div className="container-px mx-auto max-w-7xl">
        <RevealGroup className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {audiences.map((audience) => (
            <RevealItem key={audience.title}>
              <div className="group relative overflow-hidden rounded-md border border-white/15">
                <div className="relative aspect-[3/4] sm:aspect-[4/5]">
                  <motion.div
                    initial={{ opacity: 0, scale: 1.18 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={audience.image}
                      alt={`${audience.title} that Denalix Tech works with`}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </motion.div>
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                </div>
                <span className="font-display absolute bottom-4 left-4 right-4 text-sm font-semibold text-white sm:text-base">
                  {audience.title}
                </span>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
