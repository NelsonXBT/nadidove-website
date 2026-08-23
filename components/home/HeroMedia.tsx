"use client";

import Image from "next/image";
import { useState } from "react";

export default function HeroMedia() {
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div className="hero-media">
      {/* The poster is the LCP element, so it is optimised and preloaded. */}
      <Image
        className={`hero-media-poster ${
          videoReady && !videoFailed ? "hero-media-poster-hidden" : ""
        }`}
        src="/media/hero/nadidove-hero-poster.jpg"
        alt=""
        fill
        sizes="100vw"
        priority
        aria-hidden="true"
      />

      {!videoFailed && (
        <video
          className={`hero-media-video ${
            videoReady ? "hero-media-video-visible" : ""
          }`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/media/hero/nadidove-hero-poster.jpg"
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
        >
          <source src="/media/hero/nadidove-hero.mp4" type="video/mp4" />
        </video>
      )}

      <div className="hero-media-overlay" />
    </div>
  );
}
