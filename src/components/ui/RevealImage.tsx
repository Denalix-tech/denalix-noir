"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

type RevealImageProps = {
  src: string;
  alt: string;
  aspect?: string;
  sizes?: string;
  className?: string;
  overlay?: boolean;
  priority?: boolean;
};

export function RevealImage({
  src,
  alt,
  aspect = "aspect-[4/3]",
  sizes = "(max-width: 1024px) 100vw, 45vw",
  className = "",
  overlay = true,
  priority = false,
}: RevealImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);

  return (
    <div ref={ref} className={`relative overflow-hidden rounded-md border border-white/15 ${className}`}>
      <div className={`relative ${aspect}`}>
        <motion.div
          initial={{ opacity: 0, scale: 1.22 }}
          whileInView={{ opacity: 1, scale: 1.12 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ y }}
          className="absolute inset-0"
        >
          <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
        </motion.div>
        {overlay && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
        )}
      </div>
    </div>
  );
}
