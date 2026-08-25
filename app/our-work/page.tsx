import type { Metadata } from "next";
import Link from "next/link";

import Container from "@/components/ui/Container";
import Eyebrow from "@/components/ui/Eyebrow";
import FilmGallery from "@/components/ui/FilmGallery";
import Section from "@/components/ui/Section";
import { films } from "@/lib/films";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Films",
  description:
    "The Nadidove catalogue — original short films and animations written, directed and generated in-house.",
  alternates: { canonical: "/our-work" },
};

export default function OurWorkPage() {
  return (
    <main id="main">
      <section className="page-intro">
        <Container>
          <h1 className="heading-xl">Films</h1>
        </Container>
      </section>

      <Section className="films-section">
        <Container>
          <FilmGallery films={films} showFilters />
        </Container>
      </Section>

      <Section className="page-cta">
        <Container className="page-cta-inner">
          <div>
            <Eyebrow>The Channel</Eyebrow>

            <h2>Every release, first.</h2>

            <p>
              New films drop on YouTube before anywhere else. Subscribe and
              you will not miss one.
            </p>
          </div>

          <div className="page-cta-actions">
            <a
              href={site.youtube}
              className="button button--primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch on YouTube
              <span aria-hidden="true">↗</span>
            </a>

            <Link href="/contact" className="button button--secondary">
              Work With Us
            </Link>
          </div>
        </Container>
      </Section>
    </main>
  );
}
