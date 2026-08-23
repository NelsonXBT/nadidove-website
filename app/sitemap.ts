import type { MetadataRoute } from "next";

import { films } from "@/lib/films";
import { navigation, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", ...navigation.map((item) => item.href)];
  const filmPages = films.map((film) => `/our-work/${film.slug}`);

  // Evaluated once at build time, so every entry reports the same deploy
  // date rather than drifting apart across the list.
  const lastModified = new Date();

  return [...pages, ...filmPages].map((route) => ({
    url: `${site.url}${route === "/" ? "" : route}`,
    lastModified,
    changeFrequency: "monthly",
    priority: route === "/" ? 1 : 0.8,
  }));
}
