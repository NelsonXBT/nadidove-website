import type { MetadataRoute } from "next";

import { navigation, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/", ...navigation.map((item) => item.href)];

  // Evaluated once at build time, so every entry reports the same deploy
  // date rather than drifting apart across the list.
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${site.url}${route === "/" ? "" : route}`,
    lastModified,
    changeFrequency: "monthly",
    priority: route === "/" ? 1 : 0.8,
  }));
}
