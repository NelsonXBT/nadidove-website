"use client";

import { useSyncExternalStore } from "react";

import {
  AGREEMENT_ACCEPTED_KEY,
  STORAGE_KEY,
  type RegistrationFormData,
  emptyRegistration,
} from "./registration";

/*
 * Reading the draft back out of the browser
 *
 * The draft lives in sessionStorage, which only the browser has. Loading it in
 * an effect and calling setState would mean every screen renders once with an
 * empty form and then again with the real one, so instead each screen waits
 * for hydration and seeds its state from the draft directly.
 */

/** The draft is read once per mount rather than watched, so nothing subscribes. */
const noSubscription = () => () => {};

/**
 * False on the server and throughout the hydration pass, true after it.
 *
 * `getServerSnapshot` is what React renders on the server and reuses while
 * hydrating, so the two agree and the markup matches. Once hydration finishes,
 * React sees the client snapshot differs and re-renders — which gives a screen
 * a safe point at which `sessionStorage` can be read.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

/**
 * The saved draft, falling back to an empty one. Spread over `emptyRegistration`
 * so a draft written before a field existed still opens with every field
 * present. Browser only — call it after {@link useIsHydrated} reports true.
 */
export function readDraft(): RegistrationFormData {
  return { ...emptyRegistration, ...readStoredDraft() };
}

/**
 * The saved draft, but only once the agreement has been accepted in this tab.
 *
 * Null means there is nothing to review — an expired session, or the review URL
 * opened directly — and the review screen sends those back to the start rather
 * than showing an empty summary.
 */
export function readAcceptedDraft(): RegistrationFormData | null {
  const accepted = sessionStorage.getItem(AGREEMENT_ACCEPTED_KEY) === "true";
  const draft = readStoredDraft();

  if (!accepted || !draft) {
    return null;
  }

  return { ...emptyRegistration, ...draft };
}

/** Parses the stored draft, discarding it if it can no longer be read. */
function readStoredDraft(): Partial<RegistrationFormData> | null {
  const saved = sessionStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return null;
  }

  try {
    return JSON.parse(saved) as Partial<RegistrationFormData>;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);

    return null;
  }
}
