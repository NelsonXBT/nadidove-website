"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link
          href="/"
          className="site-logo"
          aria-label="Nadidove home"
          onClick={closeMenu}
        >
          NADIDOVE
        </Link>

        {/* Desktop navigation */}
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/our-work">Our Work</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          className={`mobile-menu-button ${
            menuOpen ? "is-open" : ""
          }`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile navigation */}
      <nav
        id="mobile-navigation"
        className={`mobile-nav ${menuOpen ? "is-open" : ""}`}
        aria-label="Mobile navigation"
      >
        <Link href="/our-work" onClick={closeMenu}>
          Our Work
        </Link>

        <Link href="/about" onClick={closeMenu}>
          About
        </Link>

        <Link href="/contact" onClick={closeMenu}>
          Contact
        </Link>
      </nav>
    </header>
  );
}