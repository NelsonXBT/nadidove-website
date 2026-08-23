/**
 * The film catalogue. This is the only place film data lives — the homepage
 * reel, the Our Work gallery and the sitemap all read from here.
 *
 * ── Adding a YouTube video ─────────────────────────────────────────────────
 * Paste the video's ID into `youtubeId`. The ID is the part after `v=` in a
 * watch URL, or the last path segment of a youtu.be link:
 *
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ  ->  "dQw4w9WgXcQ"
 *   https://youtu.be/dQw4w9WgXcQ                 ->  "dQw4w9WgXcQ"
 *
 * Once an ID is present the card pulls its poster frame straight from YouTube
 * and opens the film in a lightbox. Films without an ID fall back to their
 * `tone` gradient and are marked as unreleased.
 */

export type FilmCategory = "film" | "animation";

export type FilmTone =
  | "ember"
  | "gold"
  | "teal"
  | "blue"
  | "rose"
  | "violet";

export interface Film {
  /** URL-safe identifier, also used as the React key. */
  slug: string;
  /** Catalogue number shown on the card. */
  number: string;
  title: string;
  logline: string;
  category: FilmCategory;
  year: string;
  /** YouTube video ID — leave empty until the film is published. */
  youtubeId?: string;
  /** Optional custom poster in `/public`; overrides the YouTube thumbnail. */
  poster?: string;
  tone: FilmTone;
  /** Featured films appear in the homepage reel. */
  featured?: boolean;
}

export const films: Film[] = [
  {
    slug: "the-ember-warden",
    number: "01",
    title: "The Ember Warden",
    logline:
      "A mage trades his own flame to keep an ancient order of fire alive.",
    category: "film",
    year: "2026",
    youtubeId: "",
    tone: "ember",
    featured: true,
  },
  {
    slug: "he-cock",
    number: "02",
    title: "He Cock",
    logline:
      "A rooster alone keeps the sun on schedule — and he's sick of the job.",
    category: "animation",
    year: "2026",
    youtubeId: "",
    tone: "gold",
    featured: true,
  },
  {
    slug: "the-receipt",
    number: "03",
    title: "The Receipt",
    logline:
      "A Lagos hustle goes sideways when one small receipt won't disappear.",
    category: "film",
    year: "2026",
    youtubeId: "",
    tone: "teal",
    featured: true,
  },
  {
    slug: "threadbare",
    number: "04",
    title: "Threadbare",
    logline:
      "A family holds itself together with a little less thread every year.",
    category: "film",
    year: "2026",
    youtubeId: "",
    tone: "blue",
  },
  {
    slug: "ring-road-drop-off",
    number: "05",
    title: "Ring Road Drop Off",
    logline: "One ride, one road, one decision that can't be undone.",
    category: "film",
    year: "2026",
    youtubeId: "",
    tone: "rose",
  },
  {
    slug: "unreconciled",
    number: "06",
    title: "Unreconciled",
    logline:
      "Two siblings, one inheritance, and everything they never said.",
    category: "animation",
    year: "2026",
    youtubeId: "",
    tone: "violet",
  },
];

export const featuredFilms = films.filter((film) => film.featured);

/** Labels for the Our Work filter row. `all` is always first. */
export const categoryLabels: Record<FilmCategory | "all", string> = {
  all: "All",
  film: "Films",
  animation: "Animations",
};

/** Singular form, for the label on an individual card. */
export const categoryNames: Record<FilmCategory, string> = {
  film: "Short Film",
  animation: "Animation",
};

/**
 * Only offers a filter for categories that actually have films behind them,
 * so the row can never show an option that leads to an empty grid.
 */
export function availableCategories(
  list: Film[],
): (FilmCategory | "all")[] {
  const present = (["film", "animation"] as FilmCategory[]).filter(
    (category) => list.some((film) => film.category === category),
  );

  return ["all", ...present];
}

/**
 * YouTube serves `maxresdefault` only for videos uploaded above 720p.
 * `hqdefault` always exists, so it is the fallback.
 */
export function youtubeThumbnail(
  youtubeId: string,
  quality: "max" | "hq" = "max",
): string {
  const file = quality === "max" ? "maxresdefault" : "hqdefault";

  return `https://i.ytimg.com/vi/${youtubeId}/${file}.jpg`;
}

/** Privacy-preserving embed domain; no cookies until playback starts. */
export function youtubeEmbedUrl(youtubeId: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    color: "white",
  });

  return `https://www.youtube-nocookie.com/embed/${youtubeId}?${params}`;
}

export function youtubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}
