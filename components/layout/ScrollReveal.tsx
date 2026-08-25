"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Fades content up as it enters the viewport.
 *
 * One observer for the whole site rather than a wrapper around every block:
 * it collects the selectors below, marks them, and unobserves each element the
 * first time it lands. Nothing is animated twice, and no component has to know
 * the effect exists.
 *
 * Elements start hidden only once JS has confirmed it can reveal them — the
 * `data-reveal-ready` flag on `<html>` is what arms the CSS — so with JS off,
 * or if this never runs, everything stays visible instead of a blank page.
 */
const TARGETS = [
  ".section-head",
  ".film-card",
  ".process-step",
  ".positioning-head",
  ".statement-body > *",
  ".tenet",
  ".founder",
  ".founder-body",
  ".contact-opening",
  ".contact-direct",
  ".contact-reason",
  ".film-more-item",
  ".page-cta-inner > *",
  ".contact-inner > *",
  ".page-intro > * > *",
  ".film-head",
  ".film-stage",
].join(",");

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;

    // Honour a reduced-motion preference by never arming the effect.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.removeAttribute("data-reveal-ready");
      return;
    }

    root.setAttribute("data-reveal-ready", "true");

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(TARGETS),
    ).filter((el) => !el.dataset.reveal);

    // Anything already on screen at load is shown immediately, so the first
    // paint is never a viewport of invisible content waiting on a scroll.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const el = entry.target as HTMLElement;
          el.dataset.reveal = "in";
          observer.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );

    for (const el of elements) {
      const box = el.getBoundingClientRect();

      if (box.top < window.innerHeight) {
        el.dataset.reveal = "in";
        continue;
      }

      el.dataset.reveal = "out";
      observer.observe(el);
    }

    return () => observer.disconnect();
    // Re-runs per route so a client-side navigation arms the new page's blocks.
  }, [pathname]);

  return null;
}
