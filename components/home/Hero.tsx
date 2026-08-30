import Link from "next/link";

import Container from "@/components/ui/Container";
import Eyebrow from "@/components/ui/Eyebrow";
import HeroMedia from "@/components/home/HeroMedia";

export default function Hero() {
  return (
    <section className="hero">
      <HeroMedia />

      <Container className="hero-content">
        <Eyebrow>AI-Powered Film Studio</Eyebrow>

        <h1 className="hero-title">
          Bringing Artificial Intelligence{" "}
          <em>Into the Craft of Filmmaking</em>
        </h1>

        <div className="hero-action">
          <Link href="/films-by-nadidove" className="button button--primary">
            View Our Films
          </Link>
        </div>
      </Container>
    </section>
  );
}
