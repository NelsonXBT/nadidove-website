import Link from "next/link";

import { mailto, navigation, site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <Link href="/" className="footer-brand">
            {site.name}
          </Link>

          <nav className="footer-nav" aria-label="Footer navigation">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}

            <a href={mailto()}>{site.email}</a>

            <a
              href={site.youtube}
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube
            </a>
          </nav>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </span>

          <span>{site.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
