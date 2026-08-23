import type { Metadata } from "next";
import Link from "next/link";

import Container from "@/components/ui/Container";
import Eyebrow from "@/components/ui/Eyebrow";
import Section from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "About",
  description:
    "Nadidove is an AI-native film studio. We write, direct and generate original stories end to end — then release them straight to the audience.",
  alternates: { canonical: "/about" },
};

const processSteps = [
  {
    number: "01",
    label: "Write",
    title: "Write",
    description:
      "Every film starts on the page — a real story, real characters and a reason to keep watching. Nothing gets generated until the script earns it.",
  },
  {
    number: "02",
    label: "Generate",
    title: "Generate",
    description:
      "We direct AI models shot by shot to build the world, the cast and the performances, holding continuity and tone across every frame.",
  },
  {
    number: "03",
    label: "Release",
    title: "Release",
    description:
      "Each film is edited, graded and scored as a complete production, then released directly to our audience.",
  },
];

const capabilities = [
  {
    number: "01",
    title: "Original Short Films",
    description:
      "Our own IP, written and produced in-house and released on our channel.",
  },
  {
    number: "02",
    title: "Animation",
    description:
      "Stylised, character-led work for stories live action cannot reach.",
  },
  {
    number: "03",
    title: "Brand & Sponsored Films",
    description:
      "Cinematic films for brands who want story before spec sheet.",
  },
  {
    number: "04",
    title: "Series Development",
    description:
      "Worlds built to run past one episode — pitch, pilot and beyond.",
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

          <p className="body-lg">
            Nadidove is a creative film studio creating original stories
            through imagination, technology and film.
          </p>
        </Container>
      </section>

      <Section className="statement">
        <Container className="statement-inner">
          <p className="statement-label">The Studio</p>

          <div className="statement-body">
            <p className="statement-lead">
              We are directors first. AI is the camera, the crew and the
              backlot — not the author.
            </p>

            <p>
              Nadidove writes, directs and generates original films start to
              finish. There is no department to book, no gear list and no
              window of good light to wait for. There is a script, a
              direction, and a film at the end of it.
            </p>

            <p>
              That changes what a studio our size can attempt. A world that
              would once have needed a production budget and a six-month
              schedule now needs a clear idea and the discipline to hold it
              across every frame. We build the world, the characters and the
              performances through generative tools, then edit and score each
              film as a complete production.
            </p>

            <p>
              We are based in Africa and making work for anyone, anywhere,
              who still sits down for a good story.
            </p>
          </div>
        </Container>
      </Section>

      <Section className="positioning">
        <Container>
          <div className="positioning-head">
            <Eyebrow>How We Work</Eyebrow>

            <h2>From story to screen, under one roof.</h2>

            <p>
              Three stages, one team. Every Nadidove film moves through the
              same pipeline — and every creative decision inside it is ours.
            </p>
          </div>

          <div className="process">
            {processSteps.map((step) => (
              <article className="process-step" key={step.number}>
                <span className="step-num">
                  {step.number} — {step.label.toUpperCase()}
                </span>

                <h3>{step.title}</h3>

                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="capabilities">
        <Container>
          <div className="section-head">
            <h2>What We Make</h2>
          </div>

          <ul className="capability-list">
            {capabilities.map((capability) => (
              <li className="capability" key={capability.number}>
                <span className="capability-number">
                  {capability.number}
                </span>

                <h3 className="capability-title">{capability.title}</h3>

                <p className="capability-description">
                  {capability.description}
                </p>
              </li>
            ))}
          </ul>
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
