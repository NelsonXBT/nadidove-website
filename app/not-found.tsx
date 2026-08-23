import Link from "next/link";

import Container from "@/components/ui/Container";
import Eyebrow from "@/components/ui/Eyebrow";

export default function NotFound() {
  return (
    <main id="main">
      <section className="page-intro not-found">
        <Container>
          <Eyebrow>404</Eyebrow>

          <h1 className="heading-xl">
            This scene
            <br />
            was cut.
          </h1>

          <p className="body-lg">
            The page you were looking for is not here. The films still are.
          </p>

          <div className="not-found-actions">
            <Link href="/our-work" className="button button--primary">
              View Our Work
              <span aria-hidden="true">→</span>
            </Link>

            <Link href="/" className="button button--secondary">
              Back Home
            </Link>
          </div>
        </Container>
      </section>
    </main>
  );
}
