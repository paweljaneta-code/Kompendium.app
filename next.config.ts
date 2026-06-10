import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Handouts/SOS live in public/ as static assets (~340 MB). Exclude them from
  // serverless function traces — only small JSON indexes are read at runtime.
  outputFileTracingExcludes: {
    "/**": ["./public/handouts/print/**", "./public/sos/**"]
  },
  // kompendium.html is read via fs at runtime (not a static import), so include
  // it explicitly in serverless bundles — otherwise /api/plany/document 404s on Vercel.
  outputFileTracingIncludes: {
    "/api/plany/document": ["./kompendium.html"],
    "/api/**": ["./kompendium.html"]
  }
};

export default nextConfig;
