import type { Metadata } from "next";

import Container from "@/components/ui/Container";
import Eyebrow from "@/components/ui/Eyebrow";
import Section from "@/components/ui/Section";
import { contactReasons, mailto, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Commercials and brand content, collaborations, or sponsored promotions — email Nadidove directly at nadidovefilms@gmail.com.",
  alternates: { canonical: "/contact" },
};

/**
 * One compact section. The reasons to get in touch sit on the left; the
 * address sits on the right on its own base, as the single thing on the page
 * meant to be clicked.
 *
 * The DOM runs opening -> reasons -> address, which is the reading order on a
 * phone. On a wide screen the grid lifts the address into a column beside the
 * other two without moving it in the markup, so keyboard order still follows
 * the page.
 */
export default function ContactPage() {
  return (
    <main id="main">
      <Section className="contact-page">
        <Container className="contact-page-inner">
          <div className="contact-opening">
            <Eyebrow>Contact</Eyebrow>

            <h1 className="contact-title">Let’s Talk</h1>
          </div>

          <dl className="contact-reasons">
            {contactReasons.map((reason) => (
              <div className="contact-reason" key={reason.label}>
                <dt className="contact-reason-title">{reason.label}</dt>

                <dd className="contact-reason-text">{reason.description}</dd>
              </div>
            ))}
          </dl>

          <aside className="contact-direct">
            {/* The whole panel is the link, so the target is the size of the
                block rather than the width of the address inside it. */}
            <a href={mailto()} className="contact-direct-link">
              <span className="contact-direct-label">Send us an email</span>

              <span className="contact-direct-row">
                <span className="contact-direct-address">{site.email}</span>

                <span className="contact-direct-arrow" aria-hidden="true">
                  →
                </span>
              </span>
            </a>

            <div className="contact-direct-note">
              <p>
                Send us an email using the address above. Tell us what you’re
                looking to create, collaborate on, or promote. Include any
                relevant details, references, or links that will help us
                understand your idea.
              </p>

              <p>We’ll get back to you as soon as possible.</p>
            </div>
          </aside>
        </Container>
      </Section>
    </main>
  );
}
