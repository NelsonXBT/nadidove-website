import type { Metadata } from "next";

import Container from "@/components/ui/Container";
import Eyebrow from "@/components/ui/Eyebrow";
import Section from "@/components/ui/Section";
import { contactReasons, mailto, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Commercials and brand content, collaborations, or sponsored promotions — email Nadidove directly at hello@nadidove.com.",
  alternates: { canonical: "/contact" },
};

/**
 * One section, two columns. The reasons to get in touch sit on the left; the
 * page's single action — the address itself — sits on the right, with nothing
 * competing with it. Below 900px the address moves above the reasons so it is
 * never something a visitor has to scroll to find.
 */
export default function ContactPage() {
  return (
    <main id="main">
      <Section className="contact-page">
        <Container className="contact-page-inner">
          <div className="contact-opening">
            <Eyebrow>Contact</Eyebrow>

            <h1 className="contact-title">Let’s Talk</h1>

            <p className="body-lg contact-lead">
              Have a project in mind, a story you want to bring to life, or an
              opportunity to work with Nadidove? We’d love to hear from you.
            </p>
          </div>

          <aside className="contact-direct">
            <p className="contact-direct-label">Send us an email</p>

            <a href={mailto()} className="contact-direct-link">
              <span className="contact-direct-address">{site.email}</span>

              <span className="contact-direct-arrow" aria-hidden="true">
                →
              </span>
            </a>

            <p className="contact-direct-note">
              Tell us what you’re looking to create, collaborate on, or
              promote. Include any relevant details, references, or links that
              will help us understand your idea.
            </p>

            <p className="contact-direct-reply">
              We’ll get back to you as soon as we can.
            </p>
          </aside>

          <dl className="contact-reasons">
            {contactReasons.map((reason) => (
              <div className="contact-reason" key={reason.label}>
                <dt className="contact-reason-title">{reason.label}</dt>

                <dd className="contact-reason-text">{reason.description}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>
    </main>
  );
}
