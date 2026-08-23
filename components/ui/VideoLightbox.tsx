"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { youtubeEmbedUrl, youtubeWatchUrl } from "@/lib/films";

interface VideoLightboxProps {
  youtubeId: string;
  title: string;
  meta?: string;
  onClose: () => void;
}

export default function VideoLightbox({
  youtubeId,
  title,
  meta,
  onClose,
}: VideoLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    // Keep the page behind the dialog from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Send focus into the dialog and hand it back on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [handleKeyDown]);

  // This dialog only ever mounts in response to a click, so the DOM is
  // always present by the time it renders. The guard is a safety net for
  // any future server-rendered usage rather than a hydration workaround.
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — video player`}
    >
      <button
        type="button"
        className="lightbox-backdrop"
        onClick={onClose}
        aria-label="Close video"
        tabIndex={-1}
      />

      <div className="lightbox-panel">
        <div className="lightbox-bar">
          <div className="lightbox-titles">
            <p className="lightbox-title">{title}</p>

            {meta && <p className="lightbox-meta">{meta}</p>}
          </div>

          <button
            ref={closeRef}
            type="button"
            className="lightbox-close"
            onClick={onClose}
          >
            Close
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="lightbox-frame">
          <iframe
            src={youtubeEmbedUrl(youtubeId)}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        <a
          href={youtubeWatchUrl(youtubeId)}
          className="lightbox-external"
          target="_blank"
          rel="noopener noreferrer"
        >
          Watch on YouTube
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>,
    document.body,
  );
}
