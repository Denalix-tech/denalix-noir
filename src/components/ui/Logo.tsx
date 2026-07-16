import clsx from "clsx";
import MetallicPaint from "@/components/effects/MetallicPaint";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      className={clsx(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-black p-0.5",
        className
      )}
    >
      <MetallicPaint
        imageSrc="/logo-metallic.svg"
        seed={11}
        scale={4}
        liquid={0.55}
        speed={0.3}
        brightness={1.6}
        contrast={0.7}
        refraction={0.012}
        blur={0.03}
        chromaticSpread={0.6}
        fresnel={1}
        lightColor="#ffffff"
        darkColor="#151515"
        tintColor="#ffffff"
      />
    </span>
  );
}
