import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Film cards pull their poster frames straight from YouTube.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
    ],
  },

  // Trailing slashes off keeps canonical URLs matching the sitemap.
  trailingSlash: false,

  poweredByHeader: false,
};

export default nextConfig;
