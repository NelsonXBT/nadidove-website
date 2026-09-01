"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/* The hero plays these in order and then starts over. The filenames contain
   spaces, and the value goes straight into a URL, so they are percent-encoded
   here rather than relying on the browser to tidy them up. */
const CLIPS = [
  { src: "/media/hero/nadidove-hero.mp4", type: "video/mp4" },
  { src: "/media/hero/nadidove%20hero%202.mp4", type: "video/mp4" },
  { src: "/media/hero/nadidove%20hero%203.mp4", type: "video/mp4" },
] as const;

const POSTER = "/media/hero/nadidove-hero-poster.jpg";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);

  return () => query.removeEventListener("change", onChange);
}

/* Read as a subscription rather than in an effect, so the value is available on
   the first render and follows the setting if it changes mid-visit. The server
   has no preference to read, so it assumes the common case: motion allowed. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

export default function HeroMedia() {
  const videosRef = useRef<(HTMLVideoElement | null)[]>([]);

  /* `active` is the clip on screen. `pending` is one being started while still
     invisible — it is promoted to active only once it is genuinely playing, so
     a clip that has to buffer holds the previous frame instead of cutting the
     hero to black. */
  const [active, setActive] = useState(0);
  const [pending, setPending] = useState<number | null>(null);

  const [posterHidden, setPosterHidden] = useState(false);
  const [failed, setFailed] = useState<readonly number[]>([]);

  /* Only the clip on screen and the one after it may download. Letting all
     three load up front would cost every visitor tens of megabytes to watch
     the first few seconds. */
  const [primed, setPrimed] = useState<readonly number[]>([0]);

  /* Cutting between clips is motion nobody asked for, so a viewer who prefers
     reduced motion gets the first clip on a loop — which is what this hero did
     before it held more than one. */
  const rotate = !usePrefersReducedMotion();

  const allFailed = failed.length >= CLIPS.length;

  /* The next clip that is worth trying, skipping any that have already failed.
     Returns null when nothing is left. */
  const nextPlayable = useCallback(
    (from: number, broken: readonly number[]) => {
      for (let step = 1; step <= CLIPS.length; step += 1) {
        const candidate = (from + step) % CLIPS.length;
        if (!broken.includes(candidate)) return candidate;
      }
      return null;
    },
    [],
  );

  const start = useCallback((index: number) => {
    const video = videosRef.current[index];
    if (!video) return;

    /* React does not always emit `muted` into the server-rendered markup, and
       a video that is not muted is not allowed to start on its own. */
    video.muted = true;

    /* Rewind, so a clip reached for the second time starts from the top. Only
       once there is data: seeking a media element that has loaded nothing is
       ignored by some browsers and throws in others. */
    if (video.readyState > 0) video.currentTime = 0;

    void video.play().catch(() => {
      /* Autoplay was refused. The poster stays up, which is the same outcome
         as a clip that never loads. */
    });
  }, []);

  /* Kick off the first clip. `autoPlay` on the elements themselves would start
     all three at once, which is three downloads and three decoders. */
  useEffect(() => {
    start(0);
  }, [start]);

  useEffect(() => {
    if (pending !== null) start(pending);
  }, [pending, start]);

  /* Flipping `preload` to "auto" is enough for most browsers to begin
     fetching, but not all of them act on the attribute change alone. Never
     nudge the clip currently on screen: load() would restart it. */
  useEffect(() => {
    primed.forEach((index) => {
      if (index === active || index === pending) return;

      const video = videosRef.current[index];
      if (video && video.readyState === 0) video.load();
    });
  }, [primed, active, pending]);

  const handleEnded = (index: number) => {
    if (index !== active || pending !== null) return;

    const next = nextPlayable(index, failed);

    /* Nothing else can play, so this clip is the whole rotation. */
    if (next === null || next === index) {
      start(index);
      return;
    }

    setPending(next);
  };

  const handlePlaying = (index: number) => {
    if (index === pending) {
      setActive(index);
      setPending(null);
    }

    /* `canplay` clears the poster in the ordinary case, but it does not fire
       again after a swap — so if the first clip broke and this is the
       replacement that took its slot, this is the only chance to lift it. */
    if (index === active || index === pending) setPosterHidden(true);

    if (!rotate) return;

    /* Let the following clip start downloading while this one plays, so the
       crossfade has something buffered to fade into. */
    if (index === active || index === pending) {
      const next = nextPlayable(index, failed);

      if (next !== null) {
        setPrimed((current) =>
          current.includes(next) ? current : [...current, next],
        );
      }
    }
  };

  const handleError = (index: number) => {
    const broken = failed.includes(index) ? failed : [...failed, index];
    setFailed(broken);

    /* A clip that cannot play must not hold up the rotation — hand its slot to
       the next one that can. */
    if (index === active || index === pending) {
      const next = nextPlayable(index, broken);
      if (next !== null && next !== index) setPending(next);
    }
  };

  return (
    <div className="hero-media">
      {/* The poster is the LCP element, so it is optimised and preloaded. */}
      <Image
        className={`hero-media-poster ${
          posterHidden && !allFailed ? "hero-media-poster-hidden" : ""
        }`}
        src={POSTER}
        alt=""
        fill
        sizes="100vw"
        priority
        aria-hidden="true"
      />

      {!allFailed &&
        CLIPS.map((clip, index) => (
          <video
            key={clip.src}
            ref={(element) => {
              videosRef.current[index] = element;
            }}
            className={`hero-media-video ${
              index === active && posterHidden ? "hero-media-video-visible" : ""
            }`}
            muted
            loop={!rotate}
            playsInline
            preload={primed.includes(index) ? "auto" : "none"}
            poster={POSTER}
            onCanPlay={() => {
              if (index === active) setPosterHidden(true);
            }}
            onPlaying={() => handlePlaying(index)}
            onEnded={() => handleEnded(index)}
            onError={() => handleError(index)}
          >
            <source src={clip.src} type={clip.type} />
          </video>
        ))}

      <div className="hero-media-overlay" />
    </div>
  );
}
