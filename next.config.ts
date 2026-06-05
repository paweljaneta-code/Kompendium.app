import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Handouts/SOS live in public/ as static assets (~340 MB). Exclude them from
  // serverless function traces — only small JSON indexes are read at runtime.
  outputFileTracingExcludes: {
    "/**": ["./public/handouts/print/**", "./public/sos/**"]
  }
};

export default nextConfig;
