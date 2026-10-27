import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" }, // no clickjacking via iframes
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.stripe.com\")" },
        ],
      },
      {
        // Embeddable tracker loaded by client websites
        source: "/t.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
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
