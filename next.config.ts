import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
