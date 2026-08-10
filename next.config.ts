import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.189", '172.20.61.225'],
  images: {
    remotePatterns: [
      // Blog cover images served from Supabase Storage. Self-hosted Supabase
      // deployments need their own hostname added here.
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      // Apex -> www, permanent (308).
      //
      // This only fires if the request actually reaches the Next.js server.
      // The live apex currently answers with a temporary 307, which means an
      // edge layer (Cloudflare or Vercel's domain settings) is answering
      // first — in that case this rule never runs and the platform-level
      // redirect must be changed in the dashboard. See docs/seo notes in the
      // final report. Harmless either way.
      {
        source: "/:path*",
        has: [{ type: "host", value: "denalixtech.com" }],
        destination: "https://www.denalixtech.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
