"use client";

import Image from "next/image";
import { useState } from "react";

import {
  categoryLabels,
  youtubeThumbnail,
  type Film,
} from "@/lib/films";

interface FilmCardProps {
  film: Film;
  /** Called when a film with a video is activated. */
  onPlay?: (film: Film) => void;
  /** Applied to the first card in a viewport-filling grid. */
  priority?: boolean;
}

const IMAGE_SIZES =
  "(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw";

export default function FilmCard({
  film,
  onPlay,
  priority = false,
}: FilmCardProps) {
  // YouTube only generates `maxresdefault` for videos above 720p, so fall
  // back to `hqdefault` — which always exists — if the first request 404s.
  const [thumbnailQuality, setThumbnailQuality] = useState<"max" | "hq">(
    "max",
  );

  const playable = Boolean(film.youtubeId) && Boolean(onPlay);

  const poster =
    film.poster ??
    (film.youtubeId
      ? youtubeThumbnail(film.youtubeId, thumbnailQuality)
      : null);

  return (
    <article className={`film-card film-tone-${film.tone}`}>
      <div className="film-card-media">
        {poster ? (
          <Image
            src={poster}
            alt={`Still from ${film.title}`}
            fill
            sizes={IMAGE_SIZES}
            priority={priority}
            className="film-card-image"
            onError={() => setThumbnailQuality("hq")}
          />
        ) : (
          <div className="film-card-placeholder" aria-hidden="true" />
        )}

        {playable ? (
          <div className="film-card-overlay">
            <span className="film-card-play">
              <span className="film-card-play-icon" aria-hidden="true" />
              Watch Film
            </span>
          </div>
        ) : (
          <span className="film-card-status">In Production</span>
        )}
      </div>

      <div className="film-card-content">
        <div className="film-card-meta">
          <span>{categoryLabels[film.category]}</span>
          <span>{film.year}</span>
        </div>

        <h3 className="film-card-title">{film.title}</h3>

        <p className="film-card-description">{film.logline}</p>
      </div>

      {playable && (
        <button
          type="button"
          className="film-card-action"
          onClick={() => onPlay?.(film)}
        >
          <span className="sr-only">
            Play {film.title} — {categoryLabels[film.category]}, {film.year}
          </span>
        </button>
      )}
    </article>
  );
}
