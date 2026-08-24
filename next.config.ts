import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.189", '172.20.61.225'],
  // sharp is already on Next's auto-external list, so it is loaded with a native
  // require rather than bundled — but the tracer then shipped `@img/sharp-linux-x64`
  // without `@img/sharp-libvips-linux-x64`, and the binding died on the missing
  // shared object:
  //
  //   ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3: cannot open shared object file
  //
  // That threw while the /api/mcp module graph evaluated, so the route was never
  // registered and the platform served its own HTML 500 — with nothing in the
  // function log until the import was moved inside the handler. Forcing the whole
  // @img tree into the trace for the routes that touch sharp is the fix.
  //
  // Keys are route globs; values resolve from the project root.
  outputFileTracingIncludes: {
    "/api/mcp": ["./node_modules/@img/**/*"],
    "/admin/**": ["./node_modules/@img/**/*"],
  },
  experimental: {
    serverActions: {
      // Cover uploads go through a Server Action, and Next caps action request
      // bodies at 1 MB by default. That cap is enforced by the framework before
      // the action body runs, so `uploadCoverImageAction`'s own 5 MB check was
      // unreachable: every cover over 1 MB was rejected before it could report
      // why. AI-generated artwork is routinely 1–3 MB, so in practice only
      // hand-optimised images uploaded at all.
      //
      // Must stay above MAX_IMAGE_BYTES in src/lib/blog/image-type.ts. The
      // headroom is for multipart framing — boundaries, part headers, and field
      // metadata all count toward this limit, and the docs suggest 10–20 KB is
      // typical. 1 MB of slack is more than enough and keeps the two numbers
      // easy to reason about.
      bodySizeLimit: "6mb",
    },
  },
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
