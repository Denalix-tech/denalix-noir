import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";

type GlowButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
  showArrow?: boolean;
};

export function GlowButton({ href, children, variant = "primary", className, showArrow = true }: GlowButtonProps) {
  if (variant === "ghost") {
    return (
      <Link
        href={href}
        className={clsx(
          "group inline-flex items-center gap-2 rounded-sm border border-white/25 px-6 py-3 text-sm font-medium text-white transition-colors duration-300 hover:border-white hover:bg-white/5",
          className
        )}
      >
        {children}
        {showArrow && (
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={clsx(
        "btn-shine group relative inline-flex items-center gap-2 overflow-hidden rounded-sm border border-accent bg-accent px-6 py-3 text-sm font-semibold text-black transition-colors duration-300 hover:bg-black hover:text-accent",
        className
      )}
    >
      {children}
      {showArrow && (
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      )}
    </Link>
  );
}
