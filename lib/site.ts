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
 * The reasons people get in touch, listed on the contact page so a visitor can
 * recognise their own situation before writing. These are explanatory only —
 * the page deliberately offers one action, the address itself, so none of them
 * is a link and none pre-fills a subject.
 */
export interface ContactReason {
  label: string;
  description: string;
}

export const contactReasons: ContactReason[] = [
  {
    label: "Commercials & Brand Content",
    description:
      "Need a commercial for your product or brand, a cinematic brand film, or creative content for a campaign? Tell us what you’re looking to create and what you have in mind.",
  },
  {
    label: "Collaborations & Partnerships",
    description:
      "Have a story, film, or creative project you’d like to develop with us? Tell us about the idea.",
  },
  {
    label: "Sponsored Promotions & Brand Partnerships",
    description:
      "Looking to have your product or service featured by Nadidove Films, or interested in a long-term promotional partnership? Tell us what you have in mind.",
  },
];

/** Builds a `mailto:` link with an encoded, pre-filled subject line. */
export function mailto(subject?: string): string {
  if (!subject) {
    return `mailto:${site.email}`;
  }

  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}`;
}
