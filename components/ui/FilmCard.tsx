import Link from "next/link";

interface FilmCardProps {
  number: string;
  title: string;
  description: string;
  type?: string;
  year?: string;
  href?: string;
  image?: string;
  tone?: "ember" | "gold" | "teal" | "blue" | "rose" | "violet";
}

export default function FilmCard({
  number,
  title,
  description,
  type = "Short Film",
  year = "2026",
  href = "/our-work",
  image,
  tone = "ember",
}: FilmCardProps) {
  return (
    <article className="film-card">
      <Link href={href} className="film-card-link">
        <div className={`film-card-media film-tone-${tone}`}>
          {image ? (
            <img
              src={image}
              alt=""
              className="film-card-image"
            />
          ) : (
            <div className="film-card-placeholder">
              <span>FILM {number}</span>
            </div>
          )}

          <div className="film-card-overlay">
            <span className="film-card-watch">
              View Film
              <span aria-hidden="true">↗</span>
            </span>
          </div>
        </div>

        <div className="film-card-content">
          <div className="film-card-meta">
            <span>{type}</span>
            <span>{year}</span>
          </div>

          <h3 className="film-card-title">
            {title}
          </h3>

          <p className="film-card-description">
            {description}
          </p>
        </div>
      </Link>
    </article>
  );
}