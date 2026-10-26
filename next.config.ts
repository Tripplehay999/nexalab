import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async redirects() {
    return [
      { source: "/platform", destination: "/services", permanent: true },
      { source: "/what-we-do", destination: "/services", permanent: true },
      { source: "/philosophy", destination: "/about", permanent: true },
      { source: "/who-we-serve", destination: "/about", permanent: true },
      // "Start a project" now begins with account signup; query (e.g. ?plan=) is passed through.
      { source: "/contact", destination: "/auth?mode=signup", permanent: false },
    ];
  },
};

export default nextConfig;
