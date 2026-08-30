"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { primaryVideo, youtubeThumbnail, type Film } from "@/lib/films";

interface FilmCardProps {
  film: Film;
  /** Applied to the first cards in a viewport-filling grid. */
  priority?: boolean;
}

const IMAGE_SIZES =
  "(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw";

/**
 * A card opens the film's own page rather than a dialog, so a film can be
 * linked to, shared and found by search. The whole card is one link.
 */
export default function FilmCard({
  film,
  priority = false,
}: FilmCardProps) {
  // YouTube only generates `maxresdefault` for videos above 720p, so fall
  // back to `hqdefault` — which always exists — if the first request 404s.
  const [thumbnailQuality, setThumbnailQuality] = useState<"max" | "hq">(
    "max",
  );

  const video = primaryVideo(film);

  return (
    <article className={`film-card film-tone-${film.tone}`}>
      <Link href={`/films-by-nadidove/${film.slug}`} className="film-card-link">
        <div className="film-card-media">
          <Image
            src={youtubeThumbnail(video.youtubeId, thumbnailQuality)}
            alt={`Still from ${film.title}`}
            fill
            sizes={IMAGE_SIZES}
            priority={priority}
            className="film-card-image"
            onError={() => setThumbnailQuality("hq")}
          />

          <div className="film-card-overlay">
            <span className="film-card-play">
              <span className="film-card-play-icon" aria-hidden="true" />
            </span>

            <span className="film-card-watch">Watch Film</span>
          </div>
        </div>

        <div className="film-card-content">
          <div className="film-card-meta">
            <span>{film.format}</span>
            <span>{film.year}</span>
          </div>

          <h3 className="film-card-title">{film.title}</h3>

          <p className="film-card-description">{film.logline}</p>
        </div>
      </Link>
    </article>
  );
}
