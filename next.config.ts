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
    ];
  },
};

export default nextConfig;
