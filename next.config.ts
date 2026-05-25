import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "gen.pollinations.ai" },
      { protocol: "https", hostname: "image.pollinations.ai" },
    ],
  },
};

export default nextConfig;
