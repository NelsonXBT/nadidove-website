import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Serif } from "next/font/google";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ScrollReveal from "@/components/layout/ScrollReveal";
import { site } from "@/lib/site";

import "./globals.css";

/**
 * Archivo is a grotesque cut for headlines as well as text, so one family
 * carries the whole site: it holds together at 96px with tight tracking where
 * a UI-first face goes flat, and stays readable at 15px.
 */
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

/** Used for one thing: the epigraph on the About page. */
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),

  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },

  description: site.description,

  applicationName: site.name,

  alternates: { canonical: "/" },

  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: site.url,
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },

  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#080807",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${instrumentSerif.variable}`}
      // Next 16 no longer neutralises `scroll-behavior: smooth` during route
      // changes unless this attribute is present, which would otherwise make
      // every navigation animate its way back to the top.
      data-scroll-behavior="smooth"
    >
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>

        {/*
          One header and one footer for every route, the staff portal included.
          The portal used to be excluded and carry a masthead of its own, which
          made it read as a separate product sitting on the same domain.
        */}
        <Header />

        {children}

        <Footer />

        <ScrollReveal />
      </body>
    </html>
  );
}
