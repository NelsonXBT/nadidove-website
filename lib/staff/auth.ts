/**
 * Who is allowed to read a registration back.
 *
 * Two kinds of access, both cookie-based:
 *
 *   - The person who just submitted. On submission they get an httpOnly cookie
 *     naming their own record, which lets them reopen the completion screen and
 *     download their own PDF, and nothing else.
 *
 *   - The founder. A passcode from `STAFF_PORTAL_PASSCODE` unlocks the staff
 *     records screen, which reads every registration.
 *
 * Registration records hold bank details and identity documents, so both paths
 * fail closed: an unset passcode locks the records area rather than opening it,
 * and a missing or mismatched cookie is a denial rather than a fallback.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SUBMISSION_COOKIE = "nadidove_staff_submission";
const ADMIN_COOKIE = "nadidove_staff_records";

/** Long enough that someone can come back to their PDF the next day. */
const SUBMISSION_MAX_AGE = 60 * 60 * 24 * 7;

/** Short enough that a shared machine doesn't stay unlocked. */
const ADMIN_MAX_AGE = 60 * 60 * 8;

/**
 * The cookie value proves the passcode was known without storing it. The
 * passcode is the HMAC key, so the cookie cannot be turned back into it, and a
 * changed passcode invalidates every outstanding session.
 */
function adminToken(passcode: string): string {
  return createHmac("sha256", passcode).update("nadidove-staff-records").digest("hex");
}

function equals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  // timingSafeEqual throws on a length mismatch, which is itself a mismatch.
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isRecordsAccessConfigured(): boolean {
  return Boolean(process.env.STAFF_PORTAL_PASSCODE);
}

/** True when the supplied passcode matches the configured one. */
export function checkPasscode(candidate: string): boolean {
  const configured = process.env.STAFF_PORTAL_PASSCODE;

  if (!configured) {
    return false;
  }

  return equals(candidate, configured);
}

export async function grantRecordsAccess(): Promise<void> {
  const passcode = process.env.STAFF_PORTAL_PASSCODE;

  if (!passcode) {
    return;
  }

  const store = await cookies();

  store.set(ADMIN_COOKIE, adminToken(passcode), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
}

export async function revokeRecordsAccess(): Promise<void> {
  const store = await cookies();

  store.delete(ADMIN_COOKIE);
}

/** Whether the current request may read every registration. */
export async function hasRecordsAccess(): Promise<boolean> {
  const passcode = process.env.STAFF_PORTAL_PASSCODE;

  if (!passcode) {
    return false;
  }

  const store = await cookies();
  const cookie = store.get(ADMIN_COOKIE)?.value;

  if (!cookie) {
    return false;
  }

  return equals(cookie, adminToken(passcode));
}

/* ------------------------------------------------------------------
   The submitter's own record
------------------------------------------------------------------ */

export async function grantSubmissionAccess(staffId: string): Promise<void> {
  const store = await cookies();

  store.set(SUBMISSION_COOKIE, staffId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SUBMISSION_MAX_AGE,
  });
}

/** The id of the registration submitted from this browser, if any. */
export async function submittedStaffId(): Promise<string | null> {
  const store = await cookies();

  return store.get(SUBMISSION_COOKIE)?.value ?? null;
}

/**
 * Whether the current request may read one specific registration — either
 * because it submitted that one, or because it has records access.
 */
export async function canReadRegistration(staffId: string): Promise<boolean> {
  const own = await submittedStaffId();

  if (own && equals(own, staffId)) {
    return true;
  }

  return hasRecordsAccess();
}
