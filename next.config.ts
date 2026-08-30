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

  // The films gallery moved from /our-work to /films-by-nadidove. Anything
  // already pointing at the old path — a shared link, a YouTube description,
  // an indexed result — is sent on permanently rather than to the 404.
  async redirects() {
    return [
      {
        source: "/our-work",
        destination: "/films-by-nadidove",
        permanent: true,
      },
      {
        source: "/our-work/:slug",
        destination: "/films-by-nadidove/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
