/**
 * The film catalogue. This is the only place film data lives — the homepage
 * reel, the Our Work gallery, each film page and the sitemap all read from
 * here.
 *
 * ── Adding a film ──────────────────────────────────────────────────────────
 * Add an entry to `films` below. Each film needs at least one video in its
 * `videos` array; the first one is what the card and the film page open with.
 *
 * The `youtubeId` is the part after `v=` in a watch URL, or the last path
 * segment of a youtu.be link:
 *
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ  ->  "dQw4w9WgXcQ"
 *   https://youtu.be/dQw4w9WgXcQ                 ->  "dQw4w9WgXcQ"
 *
 * Extra videos — a trailer, a clip, the next episode — become selectable
 * chips under the player on the film page.
 */

export type FilmCategory = "film" | "animation";

export type FilmTone =
  | "ember"
  | "gold"
  | "teal"
  | "blue"
  | "rose"
  | "violet";

export interface FilmVideo {
  youtubeId: string;
  /** Chip label under the player. Keep it short — these sit in one row. */
  label: string;
  /** Heading above the synopsis while this video is selected. */
  heading: string;
  /** Synopsis shown beside the player for this video. */
  blurb: string;
}

export interface Film {
  /** URL segment: /our-work/<slug>. Also the React key. */
  slug: string;
  /** Catalogue number shown on the card. */
  number: string;
  title: string;
  /** One line, used on the card and as the page's meta description. */
  logline: string;
  category: FilmCategory;
  /** Shown on the card and in the film page's meta row. */
  format: string;
  year: string;
  tone: FilmTone;
  /** First entry is the primary video — the one the card opens with. */
  videos: FilmVideo[];
  /** Featured films appear in the homepage reel. */
  featured?: boolean;
}

export const films: Film[] = [
  {
    slug: "ashes-of-a-marriage",
    number: "01",
    title: "Ashes of a Marriage",
    logline:
      "A woman betrayed by her husband and tormented by his family has to rebuild a life from nothing.",
    category: "film",
    format: "Short Film",
    year: "2026",
    tone: "ember",
    featured: true,
    videos: [
      {
        youtubeId: "62yqEMf8MPM",
        label: "Full Film",
        heading: "Ashes of a Marriage",
        blurb:
          "A woman trapped in a toxic marriage is pushed out by the very people who should have protected her. Betrayed by her husband and tormented by her in-laws, she is forced to rebuild her life from nothing — while he loses everything to regret.",
      },
      {
        youtubeId: "mekRx9N2eZA",
        label: "Clip — She Fought Back",
        heading: "She Finally Fought Back",
        blurb:
          "She kept quiet for too long, until she could not any more. A moment from Ashes of a Marriage, on love, pressure, and knowing when enough is enough.",
      },
      {
        youtubeId: "Tc51tznRebo",
        label: "Clip — Ignored",
        heading: "Ignored and Tormented",
        blurb:
          "Ignored by her husband and tormented by her in-laws — an early turn in Ashes of a Marriage, and the point the silence starts to cost her.",
      },
    ],
  },
  {
    slug: "unreconciled",
    number: "02",
    title: "Unreconciled",
    logline:
      "Two lies, one mediator, and a marriage that may already be past saving.",
    category: "film",
    format: "Trailer",
    year: "2026",
    tone: "violet",
    featured: true,
    videos: [
      {
        youtubeId: "6kEV58RXczQ",
        label: "Trailer",
        heading: "Unreconciled",
        blurb:
          "After filing for divorce less than a year into their turbulent marriage, Sandra and Desmond are forced into court-ordered counselling, where a single mediator holds the key to their freedom — if their lies do not destroy them first.",
      },
    ],
  },
  {
    slug: "ring-road-drop-off",
    number: "03",
    title: "Ring Road Drop Off",
    logline: "One ride, one road, one decision that can't be undone.",
    category: "animation",
    format: "Animated Short",
    year: "2026",
    tone: "teal",
    featured: true,
    videos: [
      {
        youtubeId: "IXxfpSez8vk",
        label: "Animated Short",
        heading: "Ring Road Drop Off",
        blurb:
          "An animated short built end to end in-house. One ride, one road, and a decision that cannot be undone.",
      },
    ],
  },
  {
    slug: "the-banishment",
    number: "04",
    title: "The Banishment",
    logline:
      "An epic-scale Nollywood story, staged entirely through generative filmmaking.",
    category: "film",
    format: "Trailer",
    year: "2026",
    tone: "gold",
    videos: [
      {
        youtubeId: "6Ie2Av1K0uw",
        label: "Trailer",
        heading: "The Banishment",
        blurb:
          "A trailer production in the epic Nollywood tradition, built as a test of how far generative filmmaking can carry scale, costume and spectacle.",
      },
    ],
  },
];

export const featuredFilms = films.filter((film) => film.featured);

/** Looks a film up by URL segment. Returns `undefined` for unknown slugs. */
export function getFilm(slug: string): Film | undefined {
  return films.find((film) => film.slug === slug);
}

/** The video a card and a film page open with. */
export function primaryVideo(film: Film): FilmVideo {
  return film.videos[0];
}

/** Labels for the Our Work filter row. `all` is always first. */
export const categoryLabels: Record<FilmCategory | "all", string> = {
  all: "All",
  film: "Films",
  animation: "Animations",
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

/**
 * Privacy-preserving embed domain; no cookies are set until playback starts.
 *
 * `autoplay` is on because the iframe is only ever mounted in response to the
 * viewer pressing play — the gesture is what lets the browser allow it.
 */
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
