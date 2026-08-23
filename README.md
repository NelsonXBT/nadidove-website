# Nadidove

Marketing site for **Nadidove** — an AI-native film studio that writes, directs
and generates original short films and animation end to end.

Built with Next.js 16 (App Router, Turbopack), React 19 and plain CSS.

## Running locally

```bash
npm install
npm run dev
```

The site runs at [http://localhost:3000](http://localhost:3000).

| Command         | Does                                            |
| --------------- | ----------------------------------------------- |
| `npm run dev`   | Development server with hot reload               |
| `npm run build` | Production build (also runs a TypeScript check) |
| `npm start`     | Serve the production build                       |
| `npm run lint`  | ESLint                                           |

## Adding a film

Every film on the site — the homepage reel, the Our Work gallery and the
sitemap — is read from one array in [`lib/films.ts`](lib/films.ts). Add an entry
there and it appears everywhere.

```ts
{
  slug: "the-ember-warden",     // URL-safe id, also the React key
  number: "01",                 // catalogue number
  title: "The Ember Warden",
  logline: "A mage trades his own flame to keep an order of fire alive.",
  category: "film",             // "film" | "animation"
  year: "2026",
  youtubeId: "dQw4w9WgXcQ",     // see below
  tone: "ember",                // gradient used before a poster exists
  featured: true,               // include in the homepage reel
}
```

### Attaching the YouTube video

Put the video's **ID** — not the whole URL — in `youtubeId`:

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ   ->  "dQw4w9WgXcQ"
https://youtu.be/dQw4w9WgXcQ                  ->  "dQw4w9WgXcQ"
```

Once an ID is present the card pulls its poster frame straight from YouTube and
plays the film in a lightbox — no other change needed. Cards are keyboard
accessible and the dialog closes on `Esc`.

While `youtubeId` is empty the card shows its `tone` gradient and an **In
Production** badge instead, so unreleased titles can sit in the catalogue
safely.

To override the auto-pulled poster, drop an image in `public/` and set
`poster: "/media/films/your-still.jpg"`.

### Category filters

The Our Work filter row is generated from the films actually present, so a
category with nothing behind it never renders an empty grid. Adding the first
`"animation"` film makes the **Animations** filter appear on its own.

## Editing site-wide details

[`lib/site.ts`](lib/site.ts) is the single source of truth for the studio name,
tagline, email, YouTube URL, navigation and the contact page's routes. The
header, footer, page metadata, sitemap and contact links all read from it, so
changing a value there updates every place it appears.

The contact page is deliberately **form-free** — each route is a `mailto:` link
with the subject line pre-filled, pointing at `site.email`.

## Before deploying

Set `site.url` in `lib/site.ts` to the production domain. It resolves canonical
URLs, Open Graph tags, `robots.txt` and `sitemap.xml`.

The social share card is generated at build time from
[`app/opengraph-image.tsx`](app/opengraph-image.tsx).

## Media

The homepage hero plays `public/media/hero/nadidove-hero.mp4` over
`nadidove-hero-poster.jpg`. The poster is the LCP element and is preloaded; if
the video fails to load the poster simply stays put.

## Structure

```
app/            routes, metadata, global CSS
components/
  home/         homepage sections
  layout/       header, footer
  ui/           reusable pieces (film card, gallery, lightbox, primitives)
lib/            films.ts (catalogue), site.ts (brand + contact)
public/media/   video and images
```
