import { ImageResponse } from "next/og";

import { site } from "@/lib/site";

/**
 * The card that renders when a Nadidove link is shared on social or in a
 * messaging app. Generated at build time and reused for both Open Graph and
 * Twitter, so there is one image to keep on-brand instead of two.
 *
 * Satori (the renderer behind `ImageResponse`) supports flexbox and a subset
 * of CSS only — no grid, and every colour has to be a literal because the
 * stylesheet's custom properties are not in scope here.
 */

export const alt = `${site.name} — ${site.tagline}`;

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "#080807",
          color: "#f2eee8",
        }}
      >
        {/* A single accent hairline, echoing the site's section rules. */}
        <div
          style={{
            display: "flex",
            width: "120px",
            height: "3px",
            background: "#9b0e1f",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            We shoot with light
          </div>

          <div
            style={{
              fontSize: "76px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "rgba(242, 238, 232, 0.6)",
            }}
          >
            that was never there.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "24px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", fontWeight: 700 }}>
            {site.name.toUpperCase()}
          </div>

          <div
            style={{
              display: "flex",
              color: "rgba(242, 238, 232, 0.38)",
            }}
          >
            {site.tagline}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
