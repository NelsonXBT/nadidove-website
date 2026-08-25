"use client";

import Image from "next/image";
import { useState } from "react";

import {
  youtubeEmbedUrl,
  youtubeThumbnail,
  youtubeWatchUrl,
  type Film,
} from "@/lib/films";

interface FilmStageProps {
  film: Film;
}

/**
 * The film page's player panel.
 *
 * Nothing from YouTube is loaded on arrival — the viewer sees the poster
 * frame and presses play, which is when the iframe is mounted. That keeps the
 * page light (YouTube's player is around a megabyte of script) and matches
 * how the page is meant to behave: you land on the film, then choose to watch
 * it.
 *
 * Films with more than one video get a chip row. Selecting a different video
 * swaps the poster and the synopsis, and drops back to the paused state so
 * playback never starts without a press.
 */
export default function FilmStage({ film }: FilmStageProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  // YouTube only generates `maxresdefault` above 720p, so fall back per video
  // to `hqdefault`, which always exists.
  const [lowResIds, setLowResIds] = useState<string[]>([]);

  const active = film.videos[activeIndex];
  const hasChoices = film.videos.length > 1;

  const quality = lowResIds.includes(active.youtubeId) ? "hq" : "max";

  const selectVideo = (index: number) => {
    setActiveIndex(index);
    setPlaying(false);
  };

  return (
    <div className="film-stage">
      <div className="film-stage-main">
        <div className="film-player">
          {playing ? (
            <iframe
              key={active.youtubeId}
              className="film-player-frame"
              src={youtubeEmbedUrl(active.youtubeId)}
              title={active.heading}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <button
              type="button"
              className="film-player-poster"
              onClick={() => setPlaying(true)}
              aria-label={`Play ${active.heading}`}
            >
              <Image
                src={youtubeThumbnail(active.youtubeId, quality)}
                alt={`Still from ${active.heading}`}
                fill
                sizes="(max-width: 900px) 100vw, 70vw"
                priority
                className="film-player-image"
                onError={() =>
                  setLowResIds((ids) => [...ids, active.youtubeId])
                }
              />

              <span className="film-player-scrim" aria-hidden="true" />

              <span className="film-player-play">
                <span className="film-player-play-icon" aria-hidden="true" />
              </span>

              {/* Just the verb. The film's name is the page heading above and
                  the active video's name is in the panel beside it, so
                  repeating it here only fought with whatever the poster has
                  burned into its own artwork. */}
              <span className="film-player-cta">Play</span>
            </button>
          )}
        </div>

        {hasChoices && (
          <div className="film-chips">
            <span className="film-chips-label">Watch</span>

            <div
              className="film-chips-row"
              role="group"
              aria-label="Choose a video"
            >
              {film.videos.map((video, index) => (
                <button
                  key={video.youtubeId}
                  type="button"
                  className={`film-chip ${
                    index === activeIndex ? "film-chip--active" : ""
                  }`}
                  onClick={() => selectVideo(index)}
                  aria-pressed={index === activeIndex}
                >
                  {video.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="film-stage-side">
        <p className="film-stage-eyebrow">{active.heading}</p>

        <p className="film-stage-synopsis">{active.blurb}</p>

        <a
          href={youtubeWatchUrl(active.youtubeId)}
          className="film-stage-external"
          target="_blank"
          rel="noopener noreferrer"
        >
          Watch on YouTube
          <span aria-hidden="true">↗</span>
        </a>
      </aside>
    </div>
  );
}
