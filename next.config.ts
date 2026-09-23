import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the hosting target is plain static file hosting (PHP
  // shared hosting, no Node.js server) — no route handlers, middleware, or
  // server actions are used anywhere in this app, so this is safe.
  output: "export",
  images: {
    // Next.js's built-in image optimizer is itself a server route
    // (/_next/image), which doesn't exist in a static export. Required
    // whenever output: 'export' is set, unless a custom external loader is
    // configured instead. remotePatterns/dangerouslyAllowLocalIP below are
    // now only relevant for `next dev`, where the optimizer still runs.
    unoptimized: true,
    // Next.js 16 blocks image optimization for local/private IPs by default
    // as an SSRF guard. Our own Laravel API runs on localhost in dev (and
    // remotePatterns below already scopes exactly which host/path is
    // trusted), so this is safe to allow here.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      // Laravel API's own storage disk (product images uploaded via the admin panel)
      { protocol: "http", hostname: "localhost", port: "8787", pathname: "/storage/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "8787", pathname: "/storage/**" },
      // Seed/demo catalog images
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
