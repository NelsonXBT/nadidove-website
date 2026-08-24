import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import Container from "@/components/ui/Container";
import Eyebrow from "@/components/ui/Eyebrow";
import Section from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "About",
  description:
    "Nadidove is a director-led film studio exploring the possibilities of cinema through artificial intelligence.",
  alternates: { canonical: "/about" },
};

/**
 * What the studio holds to, shown as three columns under the statement.
 * The numbers are the only ornament — each pillar's name carries the point.
 */
const pillars = [
  {
    number: "01",
    title: "Beyond AI",
    description:
      "AI is part of our toolkit, but it doesn’t define our creative identity. Our work goes beyond the technology.",
  },
  {
    number: "02",
    title: "Director-led",
    description:
      "A film is more than what AI can generate. It’s what a human director chooses to make of it. Every frame begins with intention, direction, and a clear creative vision.",
  },
  {
    number: "03",
    title: "Speed, Without Compromise",
    description:
      "We move faster through production while maintaining the precision, detail, and quality our films demand.",
  },
];

export default function AboutPage() {
  return (
    <main id="main">
      <section className="page-intro">
        <Container>
          <Eyebrow>About</Eyebrow>

          <h1 className="heading-xl">
            A film studio built
            <br />
            for what comes next.
          </h1>
        </Container>
      </section>

      <Section className="statement">
        <Container className="statement-inner">
          <p className="statement-label">The Studio</p>

          <div className="statement-body">
            <p className="statement-lead">
              For generations, filmmakers have worked within the realities of
              locations, heavy equipment, travel, time and the many logistical
              constraints that can stand between an idea and the screen. The
              emergence of artificial intelligence is changing what is
              possible.
            </p>

            <p>
              Nadidove was born from a desire to make cinematic storytelling
              less dependent on the physical limitations of traditional
              production.
            </p>

            <p>
              We are a director-led film studio exploring the possibilities of
              cinema through artificial intelligence — expanding the canvas on
              which stories can be imagined, shaped and brought to life.
            </p>

            <p>
              Our vision is simple: to create ambitious, original films with
              the freedom to pursue the image as it was imagined, not simply as
              production allows.
            </p>
          </div>
        </Container>
      </Section>

      <Section className="positioning">
        <Container>
          <Eyebrow className="approach-label">Our Approach</Eyebrow>

          <div className="process">
            {pillars.map((pillar) => (
              <article className="process-step" key={pillar.number}>
                <span className="step-num">{pillar.number}</span>

                <h3>{pillar.title}</h3>

                <p>{pillar.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="team">
        <Container>
          <Eyebrow className="team-label">Team</Eyebrow>

          <article className="founder">
            <div className="founder-portrait">
              <Image
                src="/media/team/nelson-edeh.jpg"
                alt="Nelson Edeh, Creative Director and founder of Nadidove"
                width={1200}
                height={1200}
                sizes="(max-width: 900px) 380px, 420px"
                className="founder-image"
              />
            </div>

            <div className="founder-body">
              <p className="founder-role">Creative Director / Filmmaker</p>

              <h2 className="founder-name">Nelson Edeh</h2>

              <div className="founder-bio">
                <p>
                  Nelson Edeh is a video producer and AI filmmaker with five
                  years of experience creating cinematic entertainment and
                  digital media. His work combines creative direction, visual
                  storytelling and emerging technology, with a track record of
                  creating entertainment content that has gained significant
                  traction across social media and connected with wide
                  audiences.
                </p>

                <p>
                  He is the Creative Director and founder of Nadidove, a film
                  studio born from his work in cinematic storytelling and his
                  exploration of the possibilities of artificial intelligence
                  in filmmaking.
                </p>
              </div>
            </div>
          </article>
        </Container>
      </Section>

      <Section className="page-cta">
        <Container className="page-cta-inner">
          <div>
            <Eyebrow>Next</Eyebrow>

            <h2>See what we have made.</h2>

            <p>
              The catalogue is the clearest answer to what the studio does.
            </p>
          </div>

          <div className="page-cta-actions">
            <Link href="/our-work" className="button button--primary">
              View Our Work
              <span aria-hidden="true">→</span>
            </Link>

            <Link href="/contact" className="button button--secondary">
              Get In Touch
            </Link>
          </div>
        </Container>
      </Section>
    </main>
  );
}
