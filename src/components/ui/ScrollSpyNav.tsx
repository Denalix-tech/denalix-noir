"use client";

import { useEffect, useState } from "react";

const chapters = [
  { id: "growth-system", label: "Growth System" },
  { id: "services", label: "Services" },
  { id: "how-it-works", label: "How It Works" },
  { id: "products", label: "Products" },
  { id: "where-to-start", label: "Where to Start" },
  { id: "about", label: "Why Denalix" },
];

export function ScrollSpyNav() {
  const [active, setActive] = useState(chapters[0].id);

  useEffect(() => {
    const sections = chapters
      .map((c) => document.getElementById(c.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    sections.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="sticky top-28 z-30">
      <ul className="flex flex-col gap-4">
        {chapters.map((c) => {
          const isActive = active === c.id;
          return (
            <li key={c.id}>
              <a href={`#${c.id}`} className="group/item flex items-center gap-2.5 py-0.5">
                <span
                  className={`shrink-0 rounded-full transition-all duration-300 ${
                    isActive ? "h-2 w-2 bg-accent" : "h-1.5 w-1.5 bg-white/25 group-hover/item:bg-white/50"
                  }`}
                />
                <span
                  className={`text-sm transition-colors duration-300 ${
                    isActive ? "font-semibold text-white" : "text-muted-soft group-hover/item:text-white/70"
                  }`}
                >
                  {c.label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
