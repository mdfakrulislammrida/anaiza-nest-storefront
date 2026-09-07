import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
