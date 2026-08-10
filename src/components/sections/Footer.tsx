import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { site } from "@/lib/site-config";

/**
 * Footer navigation.
 *
 * Deliberately absent, pending owner-supplied content (see docs/seo):
 *   - Social icons: no verified LinkedIn/X profile URLs exist, and inventing
 *     destinations would send visitors somewhere we do not control.
 *   - Careers: no careers page exists yet.
 *   - Privacy / Terms: no approved policy pages exist. Linking to a missing
 *     policy is worse than not linking at all.
 * Each previously rendered as href="#", which is a dead link for users and a
 * crawl dead end. Restore them once real destinations exist.
 */
const columns = [
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Products", href: "/products" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "AI Automation Consulting", href: "/services/ai-automation-consulting" },
      { label: "Workflow Automation", href: "/services/workflow-automation" },
      { label: "Custom Software", href: "/services/custom-software-development" },
      { label: "Dashboards & Reporting", href: "/services/dashboards-reporting" },
      { label: "GIS & Mapping", href: "/services/gis-mapping" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "All Services", href: "/services" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Blog", href: "/blog" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/8 py-16">
      <div className="container-px mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <Logo />
              <span className="font-display text-lg font-semibold tracking-tight text-white">
                {site.name}
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-soft">
              {site.description}
            </p>
            <a
              href={`mailto:${site.email}`}
              className="mt-6 inline-block text-sm text-muted-soft transition-colors hover:text-white"
            >
              {site.email}
            </a>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="text-sm font-semibold text-white">{col.title}</h2>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-soft transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-8 text-xs text-muted-soft sm:flex-row">
          <p>© {new Date().getFullYear()} {site.fullName}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>{site.location}</span>
            {/* Staff link. /admin is disallowed in robots.ts, so this is for people
                who already know it exists, not for discovery. */}
            <Link href="/admin/login" className="transition-colors hover:text-white">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
