/**
 * Single source of truth for brand-level facts: name, URLs, contact routes
 * and navigation. Anything that appears in more than one place lives here so
 * it can never drift between the header, footer, metadata and contact page.
 */

export const site = {
  name: "Nadidove",
  tagline: "African Leading AI Filmmaking Studio",

  /**
   * Used by Next to resolve relative Open Graph / canonical URLs.
   * Update this to the production domain before launch.
   */
  url: "https://nadidove.com",

  description:
    "Nadidove is a creative film studio creating original stories through imagination, technology and film.",

  email: "hello@nadidove.com",

  youtube: "https://www.youtube.com/@nadidove",
} as const;

export const navigation = [
  { label: "Our Work", href: "/our-work" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

/**
 * Every route points at the same inbox but pre-fills a subject line, so mail
 * can be triaged without maintaining separate aliases.
 */
export interface ContactRoute {
  label: string;
  description: string;
  subject: string;
}

export const contactRoutes: ContactRoute[] = [
  {
    label: "Projects & Brand Films",
    description:
      "Commissioned films, brand campaigns, sponsored shorts and series development.",
    subject: "Project enquiry — [company or project name]",
  },
  {
    label: "Collaboration",
    description:
      "Writers, composers, editors and studios who want to build something with us.",
    subject: "Collaboration — [your discipline]",
  },
  {
    label: "Press & Screenings",
    description:
      "Interviews, festival programming, screening requests and press material.",
    subject: "Press — [publication or festival]",
  },
];

/** Builds a `mailto:` link with an encoded, pre-filled subject line. */
export function mailto(subject?: string): string {
  if (!subject) {
    return `mailto:${site.email}`;
  }

  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}`;
}
