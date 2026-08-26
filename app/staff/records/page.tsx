"use client";

import { useCallback, useEffect, useState } from "react";

import PortalHeader from "@/components/staff/PortalHeader";

interface StaffListEntry {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  submission_status: string;
  registration_submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface StaffDetail extends StaffListEntry {
  date_of_birth: string;
  state_of_origin: string;
  current_state: string;
  current_city: string;
  education: string;
  education_other: string | null;
  bank_name: string;
  account_number: string;
  account_name: string;
  has_completed_pdf: boolean;
  acceptance: { agreement_version: string; accepted_at: string } | null;
  documents: {
    passport: string | null;
    government_id: string | null;
    signature: string | null;
  } | null;
}

/**
 * What a records request came back with. The passcode gate is a cookie, so an
 * unauthorised response means "still locked" rather than a failure, and is worth
 * telling apart from a request that genuinely went wrong.
 */
type RecordsOutcome =
  | { status: "locked"; configured: boolean }
  | { status: "unlocked"; records: StaffListEntry[] }
  | { status: "error"; message: string };

/** Fetches the list. Holds no state of its own, so it is safe to await first. */
async function requestRecords(): Promise<RecordsOutcome> {
  try {
    const response = await fetch("/api/staff/records", { cache: "no-store" });
    const result = await response.json().catch(() => null);

    if (response.status === 401) {
      return { status: "locked", configured: result?.configured !== false };
    }

    if (!response.ok || !result?.success) {
      return {
        status: "error",
        message: result?.error ?? "Unable to load the registrations.",
      };
    }

    return { status: "unlocked", records: result.data as StaffListEntry[] };
  } catch {
    return { status: "error", message: "Unable to reach the server." };
  }
}

/**
 * Staff records — every registration, and the full detail of any one of them.
 *
 * Locked behind `STAFF_PORTAL_PASSCODE`. The list carries no banking details;
 * those and the identity documents are only fetched when a record is opened, so
 * a list left on screen is not a page of account numbers.
 */
export default function StaffRecordsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [configured, setConfigured] = useState(true);

  const [passcode, setPasscode] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const [records, setRecords] = useState<StaffListEntry[] | null>(null);
  const [selected, setSelected] = useState<StaffDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [error, setError] = useState("");

  /**
   * Applies the outcome of a records request. Split from the request itself so
   * the effect below can await the fetch before touching any state.
   */
  const applyRecords = useCallback((outcome: RecordsOutcome) => {
    if (outcome.status === "locked") {
      setUnlocked(false);
      setRecords(null);
      setConfigured(outcome.configured);

      return;
    }

    if (outcome.status === "error") {
      setError(outcome.message);

      return;
    }

    setUnlocked(true);
    setError("");
    setRecords(outcome.records);
  }, []);

  // An unlock cookie from earlier in the day means no passcode prompt.
  useEffect(() => {
    let active = true;

    (async () => {
      const outcome = await requestRecords();

      if (active) {
        applyRecords(outcome);
      }
    })();

    return () => {
      active = false;
    };
  }, [applyRecords]);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();

    if (unlocking) {
      return;
    }

    setUnlocking(true);
    setError("");

    try {
      const response = await fetch("/api/staff/records/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setError(result?.error ?? "That passcode is not correct.");

        return;
      }

      setPasscode("");
      applyRecords(await requestRecords());
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setUnlocking(false);
    }
  }

  async function lock() {
    await fetch("/api/staff/records/session", { method: "DELETE" });

    setUnlocked(false);
    setRecords(null);
    setSelected(null);
  }

  async function openRecord(id: string) {
    setLoadingDetail(true);
    setError("");

    try {
      const response = await fetch(`/api/staff/${id}`, { cache: "no-store" });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setError(result?.error ?? "Unable to load this registration.");

        return;
      }

      setSelected(result.data as StaffDetail);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setLoadingDetail(false);
    }
  }

  /* ============================================================
     LOCKED
  ============================================================ */

  if (!unlocked) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-md px-6 py-12 md:px-10">
          <PortalHeader subtitle="Staff Records" />

          <div className="mt-20">
            <h1 className="text-3xl font-medium tracking-tight">Staff records</h1>

            <p className="mt-5 leading-7 text-neutral-400">
              {configured
                ? "Enter the staff portal passcode to view registrations."
                : "Staff records are locked because STAFF_PORTAL_PASSCODE is not set on the server."}
            </p>

            {configured && (
              <form onSubmit={unlock} className="mt-10">
                <label
                  htmlFor="passcode"
                  className="mb-3 block text-sm text-neutral-400"
                >
                  Passcode
                </label>

                <input
                  id="passcode"
                  type="password"
                  value={passcode}
                  autoComplete="current-password"
                  onChange={(event) => setPasscode(event.target.value)}
                  className="w-full border border-neutral-800 bg-transparent px-5 py-4 text-white outline-none transition focus:border-[#D7192F]"
                />

                <button
                  type="submit"
                  disabled={unlocking || !passcode}
                  className="mt-8 w-full bg-[#D7192F] px-8 py-4 text-sm uppercase tracking-[0.15em] text-white transition hover:bg-[#bd1529] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {unlocking ? "Unlocking…" : "Unlock"}
                </button>
              </form>
            )}

            {error && (
              <p role="alert" className="mt-6 text-sm text-red-300">
                {error}
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  /* ============================================================
     DETAIL
  ============================================================ */

  if (selected) {
    const person = [selected.first_name, selected.middle_name, selected.last_name]
      .filter(Boolean)
      .join(" ");

    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
          <PortalHeader subtitle="Staff Records" />

          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mt-10 text-xs uppercase tracking-[0.15em] text-neutral-500 transition hover:text-white"
          >
            ← All registrations
          </button>

          <div className="mt-10">
            <h1 className="text-4xl font-medium tracking-tight">{person}</h1>

            <p className="mt-4 text-neutral-400">
              {selected.role} · {selected.submission_status}
            </p>
          </div>

          {selected.has_completed_pdf && (
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href={`/api/staff/${selected.id}/pdf?download`}
                className="bg-[#D7192F] px-8 py-4 text-center text-sm uppercase tracking-[0.15em] text-white transition hover:bg-[#bd1529]"
              >
                Download agreement
              </a>

              <a
                href={`/api/staff/${selected.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-neutral-700 px-8 py-4 text-center text-sm uppercase tracking-[0.15em] text-white transition hover:border-neutral-400"
              >
                View agreement →
              </a>
            </div>
          )}

          <div className="mt-16 space-y-14">
            <Section title="Personal">
              <Row label="First name" value={selected.first_name} />
              <Row label="Middle name" value={selected.middle_name ?? ""} />
              <Row label="Last name" value={selected.last_name} />
              <Row label="Date of birth" value={formatDate(selected.date_of_birth)} />
              <Row label="Email" value={selected.email} />
              <Row label="Phone" value={selected.phone_number} />
            </Section>

            <Section title="Professional">
              <Row label="State of origin" value={selected.state_of_origin} />
              <Row label="Current state" value={selected.current_state} />
              <Row label="Current city" value={selected.current_city} />
              <Row label="Role" value={selected.role} />
              <Row
                label="Education"
                value={
                  selected.education === "Other" && selected.education_other
                    ? `Other — ${selected.education_other}`
                    : selected.education
                }
              />
            </Section>

            <Section title="Payment">
              <Row label="Bank name" value={selected.bank_name} />
              <Row label="Account number" value={selected.account_number} />
              <Row label="Account name" value={selected.account_name} />
            </Section>

            <Section title="Agreement">
              <Row
                label="Version"
                value={selected.acceptance?.agreement_version ?? "—"}
              />
              <Row
                label="Accepted"
                value={formatDateTime(selected.acceptance?.accepted_at ?? null)}
              />
              <Row
                label="Submitted"
                value={formatDateTime(selected.registration_submitted_at)}
              />
              <Row label="Reference" value={selected.id} />
            </Section>

            {selected.documents && (
              <section className="border-t border-neutral-800 pt-8">
                <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                  Documents
                </h2>

                <p className="mt-4 text-xs leading-6 text-neutral-600">
                  These links are signed and expire after ten minutes. Reopen
                  this record for fresh ones.
                </p>

                <div className="mt-6 flex flex-wrap gap-4">
                  <DocumentLink
                    label="Passport photograph"
                    href={selected.documents.passport}
                  />
                  <DocumentLink
                    label="Government ID"
                    href={selected.documents.government_id}
                  />
                  <DocumentLink
                    label="Signature"
                    href={selected.documents.signature}
                  />
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    );
  }

  /* ============================================================
     LIST
  ============================================================ */

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-10">
        <PortalHeader subtitle="Staff Records" />

        <div className="mt-16 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-medium tracking-tight">
              Staff registrations
            </h1>

            <p className="mt-4 text-neutral-400">
              {records === null
                ? "Loading…"
                : `${records.length} ${
                    records.length === 1 ? "registration" : "registrations"
                  }`}
            </p>
          </div>

          <button
            type="button"
            onClick={lock}
            className="text-xs uppercase tracking-[0.15em] text-neutral-500 transition hover:text-white"
          >
            Lock records
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-8 text-sm text-red-300">
            {error}
          </p>
        )}

        {records !== null && records.length === 0 && (
          <p className="mt-16 border-t border-neutral-800 pt-8 text-neutral-500">
            No registrations yet.
          </p>
        )}

        {records !== null && records.length > 0 && (
          <ul className="mt-12 divide-y divide-neutral-900 border-t border-neutral-800">
            {records.map((record) => (
              <li key={record.id}>
                <button
                  type="button"
                  onClick={() => openRecord(record.id)}
                  disabled={loadingDetail}
                  className="flex w-full flex-col gap-3 py-6 text-left transition hover:bg-neutral-950 sm:flex-row sm:items-center sm:justify-between sm:gap-6 disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg">
                      {[record.first_name, record.middle_name, record.last_name]
                        .filter(Boolean)
                        .join(" ")}
                    </p>

                    <p className="mt-1 truncate text-sm text-neutral-500">
                      {record.role} · {record.email}
                    </p>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                      {record.submission_status}
                    </p>

                    <p className="mt-1 text-sm text-neutral-600">
                      {formatDate(
                        record.completed_at ??
                          record.registration_submitted_at ??
                          record.created_at,
                      )}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-neutral-800 pt-8">
      <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        {title}
      </h2>

      <dl className="mt-6 divide-y divide-neutral-900">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
      <dt className="text-xs uppercase tracking-[0.15em] text-neutral-500">
        {label}
      </dt>

      <dd className="break-words text-white">{value || "—"}</dd>
    </div>
  );
}

function DocumentLink({
  label,
  href,
}: {
  label: string;
  href: string | null;
}) {
  if (!href) {
    return (
      <span className="border border-neutral-900 px-5 py-3 text-xs uppercase tracking-[0.15em] text-neutral-700">
        {label} — none
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="border border-neutral-700 px-5 py-3 text-xs uppercase tracking-[0.15em] text-neutral-300 transition hover:border-[#D7192F] hover:text-white"
    >
      {label} →
    </a>
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${formatDate(value)} at ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
