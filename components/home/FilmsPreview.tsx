import Link from "next/link";

import Container from "@/components/ui/Container";
import FilmCard from "@/components/ui/FilmCard";
import Section from "@/components/ui/Section";

const featuredFilms = [
  {
    number: "01",
    title: "The Ember Warden",
    description:
      "A mage trades his own flame to keep an ancient order of fire alive.",
    type: "Short Film",
    year: "2026",
    tone: "ember" as const,
  },
  {
    number: "02",
    title: "He Cock",
    description:
      "A rooster alone keeps the sun on schedule — and he's sick of the job.",
    type: "Short Film",
    year: "2026",
    tone: "gold" as const,
  },
  {
    number: "03",
    title: "The Receipt",
    description:
      "A Lagos hustle goes sideways when one small receipt won't disappear.",
    type: "Short Film",
    year: "2026",
    tone: "teal" as const,
  },
];

export default function FilmsPreview() {
  return (
    <Section className="films-preview">
      <Container>
        <div className="section-head">
          <h2>
            Six worlds so far.
            <br />
            More every month.
          </h2>

          <Link
            href="/our-work"
            className="button button--secondary"
          >
            View All Films
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="film-grid">
          {featuredFilms.map((film) => (
            <FilmCard
              key={film.number}
              {...film}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}