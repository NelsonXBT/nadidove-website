import Link from "next/link";

import Container from "@/components/ui/Container";
import Eyebrow from "@/components/ui/Eyebrow";
import Section from "@/components/ui/Section";

export default function ContactCta() {
  return (
    <Section className="contact">
      <Container className="contact-inner">
        <Eyebrow>Get In Touch</Eyebrow>

        <h2>Let&rsquo;s Talk</h2>

        <p>
          Interested in working together? Tell us what you have in mind and
          we will be in touch shortly.
        </p>

        <Link href="/contact" className="button button--primary">
          Contact Us
        </Link>
      </Container>
    </Section>
  );
}
