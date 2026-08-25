import Link from "next/link";

import Container from "@/components/ui/Container";
import Eyebrow from "@/components/ui/Eyebrow";
import Section from "@/components/ui/Section";

/**
 * Uses the same closing band as every other page rather than a layout of its
 * own — heading on the left, action on the right — so the site ends the same
 * way wherever you are in it.
 */
export default function ContactCta() {
  return (
    <Section className="page-cta">
      <Container className="page-cta-inner">
        <div>
          <Eyebrow>Get In Touch</Eyebrow>

          <h2>Let&rsquo;s Talk</h2>

          <p>
            Interested in working together? Tell us what you have in mind and
            we will be in touch shortly.
          </p>
        </div>

        <div className="page-cta-actions">
          <Link href="/contact" className="button button--primary">
            Contact Us
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
