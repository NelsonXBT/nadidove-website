import type { Metadata } from "next";
import Link from "next/link";

import Container from "@/components/ui/Container";
import Eyebrow from "@/components/ui/Eyebrow";
import Section from "@/components/ui/Section";
import { contactRoutes, mailto, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Commission a film, collaborate, or request press material. Email Nadidove directly — no forms.",
  alternates: { canonical: "/contact" },
};

const briefingPoints = [
  {
    number: "01",
    title: "What it is",
    description:
      "A brand film, a sponsored short, a series, or something that does not have a name yet. One line is enough to start.",
  },
  {
    number: "02",
    title: "Who it is for",
    description:
      "The brand, the platform and the audience you are trying to reach.",
  },
  {
    number: "03",
    title: "When you need it",
    description:
      "A real date is more useful than “as soon as possible” — it tells us straight away whether we can take it on.",
  },
  {
    number: "04",
    title: "What you already have",
    description:
      "Script, deck, references, budget range, a rough voice note. Send whatever exists; nothing needs to be finished.",
  },
];

export default function ContactPage() {
  return (
    <main id="main">
      <section className="page-intro">
        <Container>
          <Eyebrow>Contact</Eyebrow>

          <h1 className="heading-xl">
            Tell us what
            <br />
            you are picturing.
          </h1>

          <p className="body-lg">
            No forms, no ticket numbers. One inbox, read by the people who
            make the films.
          </p>

          <a href={mailto()} className="contact-email">
            {site.email}
            <span aria-hidden="true">↗</span>
          </a>
        </Container>
      </section>

      <Section className="contact-routes-section">
        <Container>
          <div className="section-head">
            <h2>Pick a lane</h2>
          </div>

          <p className="contact-routes-note">
            Every link below opens a message to {site.email} with the subject
            line already filled in — it is the fastest way to reach the right
            person.
          </p>

          <div className="contact-routes">
            {contactRoutes.map((route) => (
              <a
                key={route.label}
                href={mailto(route.subject)}
                className="contact-route"
              >
                <h3 className="contact-route-title">{route.label}</h3>

                <p className="contact-route-description">
                  {route.description}
                </p>

                <span className="contact-route-action">
                  Start an email
                  <span aria-hidden="true">→</span>
                </span>
              </a>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="contact-brief">
        <Container className="contact-brief-inner">
          <div className="contact-brief-main">
            <Eyebrow>Before You Send</Eyebrow>

            <h2>Four lines that get you a real answer.</h2>

            <p className="contact-brief-lead">
              We would rather read a short, specific email than a long, vague
              one. If you cover these, we can usually tell you yes, no, or
              &ldquo;here is what it would take&rdquo; in a single reply.
            </p>

            <ol className="brief-list">
              {briefingPoints.map((point) => (
                <li className="brief-item" key={point.number}>
                  <span className="brief-number">{point.number}</span>

                  <div>
                    <h3 className="brief-title">{point.title}</h3>

                    <p className="brief-description">{point.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <aside className="contact-aside">
            <div className="contact-aside-block">
              <p className="contact-aside-label">Response Time</p>

              <p className="contact-aside-value">
                Two to three working days. If it is time-critical, put the
                deadline in the subject line.
              </p>
            </div>

            <div className="contact-aside-block">
              <p className="contact-aside-label">Email</p>

              <a href={mailto()} className="contact-aside-link">
                {site.email}
              </a>
            </div>

            <div className="contact-aside-block">
              <p className="contact-aside-label">Watch First</p>

              <a
                href={site.youtube}
                className="contact-aside-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                YouTube — @nadidove
                <span aria-hidden="true"> ↗</span>
              </a>

              <Link href="/our-work" className="contact-aside-link">
                The full catalogue
              </Link>
            </div>

            <div className="contact-aside-block">
              <p className="contact-aside-label">Studio</p>

              <p className="contact-aside-value">
                {site.tagline}. Working remotely with clients worldwide.
              </p>
            </div>
          </aside>
        </Container>
      </Section>
    </main>
  );
}
