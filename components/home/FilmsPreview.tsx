import Link from "next/link";

import Container from "@/components/ui/Container";
import FilmGallery from "@/components/ui/FilmGallery";
import Section from "@/components/ui/Section";
import { featuredFilms } from "@/lib/films";

export default function FilmsPreview() {
  return (
    <Section className="films-preview">
      <Container>
        <div className="section-head">
          <h2>Our Films</h2>
        </div>

        <FilmGallery films={featuredFilms} />

        <Link
          href="/films-by-nadidove"
          className="button button--secondary films-more"
        >
          View All Films
          <span aria-hidden="true">→</span>
        </Link>
      </Container>
    </Section>
  );
}
