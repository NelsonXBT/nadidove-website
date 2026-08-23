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
          We shoot with light that <em>was never there.</em>
        </h1>

        {/* <p className="body-lg hero-description">
          Nadidove writes, directs and generates original short films using
          AI — then puts them where you already watch things. No department,
          no gear list. Just story, built frame by frame.
        </p> */}

        <div className="hero-action">
          <Link
            href="/our-work"
            className="button button--primary"
          >
            View Our Works
          </Link>
        </div>
      </Container>
    </section>
  );
}