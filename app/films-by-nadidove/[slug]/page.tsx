import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import FilmStage from "@/components/film/FilmStage";
import Container from "@/components/ui/Container";
import Section from "@/components/ui/Section";
import {
  categoryLabels,
  films,
  getFilm,
  primaryVideo,
  youtubeThumbnail,
} from "@/lib/films";

interface FilmPageProps {
  params: Promise<{ slug: string }>;
}

/** Every film is known at build time, so all film pages are prerendered. */
export function generateStaticParams() {
  return films.map((film) => ({ slug: film.slug }));
}

export async function generateMetadata({
  params,
}: FilmPageProps): Promise<Metadata> {
  const { slug } = await params;
  const film = getFilm(slug);

  if (!film) {
    return { title: "Film not found" };
  }

  // The film's own poster frame makes a better share card than the site-wide
  // one, so it overrides the default for these pages.
  const poster = youtubeThumbnail(primaryVideo(film).youtubeId);

  return {
    title: film.title,
    description: film.logline,
    alternates: { canonical: `/films-by-nadidove/${film.slug}` },
    openGraph: {
      type: "video.other",
      title: film.title,
      description: film.logline,
      url: `/films-by-nadidove/${film.slug}`,
      images: [{ url: poster, width: 1280, height: 720, alt: film.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: film.title,
      description: film.logline,
      images: [poster],
    },
  };
}

export default async function FilmPage({ params }: FilmPageProps) {
  const { slug } = await params;
  const film = getFilm(slug);

  if (!film) {
    notFound();
  }

  const others = films.filter((entry) => entry.slug !== film.slug);

  return (
    <main id="main" className={`film-page film-tone-${film.tone}`}>
      <Container>
        <Link href="/films-by-nadidove" className="film-back">
          <span aria-hidden="true">←</span>
          Back to Films
        </Link>

        <div className="film-head">
          <h1 className="film-title">{film.title}</h1>

          <div className="film-meta">
            <span>{film.format}</span>
            <span aria-hidden="true">·</span>
            <span>{categoryLabels[film.category]}</span>
            <span aria-hidden="true">·</span>
            <span>{film.year}</span>
          </div>
        </div>

        <FilmStage film={film} />
      </Container>

      {others.length > 0 && (
        <Section className="film-more">
          <Container>
            <div className="section-head">
              <h2>More From Nadidove</h2>
            </div>

            <ul className="film-more-list">
              {others.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/films-by-nadidove/${entry.slug}`}
                    className="film-more-item"
                  >
                    <span className="film-more-number">{entry.number}</span>

                    <span className="film-more-title">{entry.title}</span>

                    <span className="film-more-format">{entry.format}</span>

                    <span className="film-more-arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}
    </main>
  );
}
