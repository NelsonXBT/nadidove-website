"use client";

import { useMemo, useState } from "react";

import FilmCard from "@/components/ui/FilmCard";
import VideoLightbox from "@/components/ui/VideoLightbox";
import {
  availableCategories,
  categoryLabels,
  type Film,
  type FilmCategory,
} from "@/lib/films";

interface FilmGalleryProps {
  films: Film[];
  /** Shows the category filter row above the grid. */
  showFilters?: boolean;
}

export default function FilmGallery({
  films,
  showFilters = false,
}: FilmGalleryProps) {
  const [category, setCategory] = useState<FilmCategory | "all">("all");
  const [activeFilm, setActiveFilm] = useState<Film | null>(null);

  const categories = useMemo(
    () => availableCategories(films),
    [films],
  );

  const visibleFilms = useMemo(
    () =>
      category === "all"
        ? films
        : films.filter((film) => film.category === category),
    [films, category],
  );

  return (
    <>
      {showFilters && categories.length > 1 && (
        <div
          className="work-filters"
          role="group"
          aria-label="Filter work by category"
        >
          {categories.map((option) => (
            <button
              key={option}
              type="button"
              className={`work-filter ${
                option === category ? "work-filter--active" : ""
              }`}
              onClick={() => setCategory(option)}
              aria-pressed={option === category}
            >
              {categoryLabels[option]}
            </button>
          ))}
        </div>
      )}

      <div className="film-grid">
        {visibleFilms.map((film, index) => (
          <FilmCard
            key={film.slug}
            film={film}
            onPlay={setActiveFilm}
            priority={index < 3}
          />
        ))}
      </div>

      {visibleFilms.length === 0 && (
        <p className="work-empty">
          Nothing here yet — new work lands every month.
        </p>
      )}

      {activeFilm?.youtubeId && (
        <VideoLightbox
          youtubeId={activeFilm.youtubeId}
          title={activeFilm.title}
          meta={`${categoryLabels[activeFilm.category]} · ${activeFilm.year}`}
          onClose={() => setActiveFilm(null)}
        />
      )}
    </>
  );
}
