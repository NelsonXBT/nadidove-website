import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <Link href="/" className="footer-brand">
            Nadidove
          </Link>

          <nav
            className="footer-nav"
            aria-label="Footer navigation"
          >
            <Link href="/our-work">Our Work</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Nadidove. All Rights Reserved
          </span>

          <span>
            African Leading AI Filmmaking Studio
          </span>
        </div>
      </div>
    </footer>
  );
}