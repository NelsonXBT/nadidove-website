import Link from "next/link";

import Container from "@/components/ui/Container";
import Eyebrow from "@/components/ui/Eyebrow";
import Section from "@/components/ui/Section";

export default function ContactCta() {
  return (
    <Section className="contact">
      <Container className="contact-inner">
        <Eyebrow>Get In Touch</Eyebrow>

        <h2>
          Have a project, a brand, or a story in mind?
        </h2>

        <p>
          Tell us what you're picturing — a sponsored short, a series, or
          something we haven't made yet. We'll get back within a few days.
        </p>

        <Link
          href="/contact"
          className="button button--primary"
        >
          Contact Us
        </Link>
      </Container>
    </Section>
  );
}