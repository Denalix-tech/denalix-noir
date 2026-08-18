import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site-config";
import { SITE_ORIGIN } from "@/lib/site-url";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const DEFAULT_TITLE = "AI Automation & Custom Software Consulting | Denalix Tech";
const DEFAULT_DESCRIPTION =
  "Denalix Tech helps startups, local businesses, and healthcare teams automate workflows, build custom software, and create dashboards that scale.";

export const metadata: Metadata = {
  // Lets every route below declare canonicals and OG images as relative paths.
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    // `default` is used verbatim, so it already carries the brand and is not
    // run through the template — that would duplicate "Denalix Tech".
    default: DEFAULT_TITLE,
    template: "%s | Denalix Tech",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: site.fullName,
  openGraph: {
    type: "website",
    siteName: site.fullName,
    locale: "en_US",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: "/",
    // Resolved from the opengraph-image file convention in this same segment.
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        {/*
          Declared here rather than through `metadata.alternates.types`, because a
          page that sets `alternates.canonical` replaces the parent's entire
          `alternates` object — which silently dropped this from every page that
          declares a canonical, i.e. all of them. In the tree it is hoisted into
          <head> and nothing can override it.
        */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${site.fullName} — Blogs`}
          href="/feed.xml"
        />
      </head>
      <body className="min-h-full flex flex-col bg-ink text-foreground">{children}</body>
    </html>
  );
}
