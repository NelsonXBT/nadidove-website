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

/* How long a clip takes to dissolve in, and so also how early the clip before
   it has to hand over. Must match `--hero-fade` on `.hero-media`. */
const FADE_MS = 900;

/* When the outgoing clip is dropped, measured from the start of the dissolve.
   The margin on top of the fade keeps the drop from landing a frame early,
   while the clip above it is still fractionally transparent. */
const RETIRE_MS = FADE_MS + 120;

/* Handing over early only makes sense for a clip comfortably longer than the
   dissolve itself. Anything shorter waits for `ended`. */
const MIN_PREROLL_SECONDS = (FADE_MS / 1000) * 2;

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

  /* `active` is the clip dissolving in, or already on screen. `under` is the
     one it is dissolving over — still playing, still fully opaque, until the
     clip above covers it completely. Only ever fading a clip *in* is what
     keeps a transition from dipping: two half-transparent clips over the
     near-black backdrop composite to less than either alone, so the old
     symmetric crossfade pulsed dark in the middle of every cut.

     `pending` is a clip being started while still invisible, promoted to
     `active` only once it is genuinely playing — so a clip that has to buffer
     holds the previous one on screen instead of cutting the hero to black. */
  const [active, setActive] = useState(0);
  const [under, setUnder] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);

  const [posterHidden, setPosterHidden] = useState(false);
  const [failed, setFailed] = useState<readonly number[]>([]);

  /* Only the clip on screen and the one after it may download. Letting all
     three load up front would cost every visitor tens of megabytes to watch
     the first few seconds. */
  const [primed, setPrimed] = useState<readonly number[]>([0]);

  /* Media events arrive between renders, and more than one can land before
     React has re-rendered. They need the clip that is on screen *now*, not the
     one that was when their handler was created. */
  const activeRef = useRef(0);

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
       ignored by some browsers and throws in others. Retiring a clip already
       rewinds it, so on the second time round this is usually a no-op. */
    if (video.readyState > 0 && video.currentTime > 0) video.currentTime = 0;

    void video.play().catch(() => {
      /* Autoplay was refused. The poster stays up, which is the same outcome
         as a clip that never loads. */
    });
  }, []);

  /* Give the frame to `index` and slide whatever held it underneath, to be
     dissolved over rather than faded out. */
  const promote = useCallback((index: number) => {
    setPending(null);

    /* Read through the ref, not `active`: `playing` and `seeked` can both land
       before React re-renders, and without a synchronous guard the second one
       would make this clip its own `under` and strand it there. */
    if (activeRef.current === index) return;

    setUnder(activeRef.current);
    activeRef.current = index;
    setActive(index);
  }, []);

  /* Kick off the first clip. `autoPlay` on the elements themselves would start
     all three at once, which is three downloads and three decoders. */
  useEffect(() => {
    start(0);
  }, [start]);

  useEffect(() => {
    if (pending !== null) start(pending);
  }, [pending, start]);

  /* Drop the clip underneath once the one above it is fully opaque, and stop it
     decoding. Through a dissolve two clips play at once, and leaving the old
     one running afterwards is enough to start dropping frames on a modest
     machine. Rewinding it here, while it is idle and invisible, also means its
     first frame is ready long before its next turn — so it cannot briefly show
     the frame it ended on. */
  useEffect(() => {
    if (under === null) return;

    const timer = window.setTimeout(() => {
      const video = videosRef.current[under];

      if (video) {
        video.pause();
        if (video.readyState > 0) video.currentTime = 0;
      }

      setUnder(null);
    }, RETIRE_MS);

    return () => window.clearTimeout(timer);
  }, [under]);

  /* Flipping `preload` to "auto" is enough for most browsers to begin
     fetching, but not all of them act on the attribute change alone. Never
     nudge a clip that is on screen: load() would restart it. */
  useEffect(() => {
    primed.forEach((index) => {
      if (index === active || index === pending || index === under) return;

      const video = videosRef.current[index];
      if (video && video.readyState === 0) video.load();
    });
  }, [primed, active, pending, under]);

  /* Runs when a clip has both started playing and settled on the frame it is
     going to show. Both halves matter: a rewound clip can report itself as
     playing while the seek to frame 0 is still in flight, and promoting it then
     would dissolve to the frame it ended on. */
  const settle = (index: number) => {
    const video = videosRef.current[index];
    if (!video || video.seeking) return;

    if (index === pending) promote(index);

    /* `promote` has already moved the ref, so a clip that just took the frame
       passes this too. */
    if (index !== activeRef.current) return;

    setPosterHidden(true);

    if (!rotate) return;

    /* Let the following clip start downloading while this one plays, so the
       dissolve has something buffered to fade into. */
    const next = nextPlayable(index, failed);

    if (next !== null) {
      setPrimed((current) =>
        current.includes(next) ? current : [...current, next],
      );
    }
  };

  /* Start the next clip *before* this one runs out, so the dissolve happens
     over footage that is still moving. Triggering the handover on `ended` — as
     this used to — freezes the final frame for the whole crossfade plus however
     long the next clip takes to get going, which is the hitch at every cut. */
  const handleTimeUpdate = (index: number) => {
    if (!rotate) return;
    if (index !== activeRef.current || pending !== null) return;

    const video = videosRef.current[index];
    if (!video) return;

    const { duration, currentTime } = video;

    if (!Number.isFinite(duration) || duration < MIN_PREROLL_SECONDS) return;
    if (duration - currentTime > FADE_MS / 1000) return;

    const next = nextPlayable(index, failed);
    if (next === null || next === index) return;

    setPending(next);
  };

  const handleEnded = (index: number) => {
    /* The early handover above normally gets there first, so this is the
       fallback: a clip whose duration the browser never reported, or one too
       short to hand over early. */
    if (index !== activeRef.current || pending !== null) return;

    const next = nextPlayable(index, failed);

    /* Nothing else can play, so this clip is the whole rotation. */
    if (next === null || next === index) {
      start(index);
      return;
    }

    setPending(next);
  };

  const handleError = (index: number) => {
    const broken = failed.includes(index) ? failed : [...failed, index];
    setFailed(broken);

    /* A clip that cannot play must not hold up the rotation — hand its slot to
       the next one that can. */
    if (index === activeRef.current || index === pending) {
      const next = nextPlayable(index, broken);
      if (next !== null && next !== index) setPending(next);
    }
  };

  return (
    <div className="hero-media">
      {/* The poster is the LCP element, so it is optimised and preloaded. It
          also stays fully opaque underneath the first clip's whole fade-in,
          which is what gives that fade something solid to resolve against. */}
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
            className={[
              "hero-media-video",
              index === active && posterHidden
                ? "hero-media-video-active"
                : "",
              index === under ? "hero-media-video-under" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            muted
            loop={!rotate}
            playsInline
            preload={primed.includes(index) ? "auto" : "none"}
            poster={POSTER}
            onCanPlay={() => {
              if (index === activeRef.current) setPosterHidden(true);
            }}
            onPlaying={() => settle(index)}
            onSeeked={() => settle(index)}
            onTimeUpdate={() => handleTimeUpdate(index)}
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
