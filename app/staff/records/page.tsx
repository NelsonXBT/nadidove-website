"use client";

import { useCallback, useEffect, useState } from "react";

import PortalPage, {
  PortalGroup,
  PortalHead,
  PortalRow,
} from "@/components/staff/PortalPage";

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
      <PortalPage>
        <PortalHead eyebrow="Staff records" title="Staff records">
          <p className="portal-lead">
            {configured
              ? "Enter the staff portal passcode to view registrations."
              : "Staff records are locked because STAFF_PORTAL_PASSCODE is not set on the server."}
          </p>
        </PortalHead>

        {configured && (
          <form onSubmit={unlock} className="portal-block">
            <label htmlFor="passcode" className="portal-label">
              Passcode
            </label>

            <input
              id="passcode"
              type="password"
              value={passcode}
              autoComplete="current-password"
              onChange={(event) => setPasscode(event.target.value)}
              className="portal-input"
            />

            <div className="portal-actions">
              <button
                type="submit"
                disabled={unlocking || !passcode}
                className="button button--primary"
              >
                {unlocking ? "Unlocking…" : "Unlock"}
              </button>
            </div>
          </form>
        )}

        {error && (
          <div role="alert" className="portal-notice">
            {error}
          </div>
        )}
      </PortalPage>
    );
  }

  /* ============================================================
     DETAIL
  ============================================================ */

  if (selected) {
    const person = [
      selected.first_name,
      selected.middle_name,
      selected.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <PortalPage>
        <PortalHead eyebrow="Staff records" title={person}>
          <p className="portal-lead">
            {selected.role} · {selected.submission_status}
          </p>
        </PortalHead>

        <div className="portal-actions">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="portal-back"
          >
            <span aria-hidden="true">←</span> All registrations
          </button>
        </div>

        {selected.has_completed_pdf && (
          <div className="portal-actions">
            <a
              href={`/api/staff/${selected.id}/pdf?download`}
              className="button button--primary"
            >
              Download agreement
            </a>

            <a
              href={`/api/staff/${selected.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="button button--secondary"
            >
              View agreement →
            </a>
          </div>
        )}

        {error && (
          <div role="alert" className="portal-notice">
            {error}
          </div>
        )}

        <PortalGroup title="Personal">
          <PortalRow label="First name" value={selected.first_name} />
          <PortalRow label="Middle name" value={selected.middle_name} />
          <PortalRow label="Last name" value={selected.last_name} />
          <PortalRow
            label="Date of birth"
            value={formatDate(selected.date_of_birth)}
          />
          <PortalRow label="Email" value={selected.email} />
          <PortalRow label="Phone" value={selected.phone_number} />
        </PortalGroup>

        <PortalGroup title="Professional">
          <PortalRow
            label="State of origin"
            value={selected.state_of_origin}
          />
          <PortalRow label="Current state" value={selected.current_state} />
          <PortalRow label="Current city" value={selected.current_city} />
          <PortalRow label="Role" value={selected.role} />
          <PortalRow
            label="Education"
            value={
              selected.education === "Other" && selected.education_other
                ? `Other — ${selected.education_other}`
                : selected.education
            }
          />
        </PortalGroup>

        <PortalGroup title="Payment">
          <PortalRow label="Bank name" value={selected.bank_name} />
          <PortalRow label="Account number" value={selected.account_number} />
          <PortalRow label="Account name" value={selected.account_name} />
        </PortalGroup>

        <PortalGroup title="Agreement">
          <PortalRow
            label="Version"
            value={selected.acceptance?.agreement_version}
          />
          <PortalRow
            label="Accepted"
            value={formatDateTime(selected.acceptance?.accepted_at ?? null)}
          />
          <PortalRow
            label="Submitted"
            value={formatDateTime(selected.registration_submitted_at)}
          />
          <PortalRow label="Reference" value={selected.id} />
        </PortalGroup>

        {selected.documents && (
          <section className="portal-block">
            <h2 className="portal-block-title">Documents</h2>

            <p className="portal-block-text">
              These links are signed and expire after ten minutes. Reopen this
              record for fresh ones.
            </p>

            <div className="portal-chips">
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
      </PortalPage>
    );
  }

  /* ============================================================
     LIST
  ============================================================ */

  return (
    <PortalPage wide>
      <PortalHead eyebrow="Staff records" title="Staff registrations">
        <p className="portal-lead">
          {records === null
            ? "Loading…"
            : `${records.length} ${
                records.length === 1 ? "registration" : "registrations"
              }`}
        </p>
      </PortalHead>

      <div className="portal-actions">
        <button type="button" onClick={lock} className="portal-back">
          Lock records
        </button>
      </div>

      {error && (
        <div role="alert" className="portal-notice">
          {error}
        </div>
      )}

      {records !== null && records.length === 0 && (
        <div className="portal-block">
          <p className="portal-block-text">No registrations yet.</p>
        </div>
      )}

      {records !== null && records.length > 0 && (
        <ul className="portal-list">
          {records.map((record) => (
            <li key={record.id}>
              <button
                type="button"
                onClick={() => openRecord(record.id)}
                disabled={loadingDetail}
                className="portal-list-row"
              >
                <span className="portal-list-text">
                  <span className="portal-list-name">
                    {[record.first_name, record.middle_name, record.last_name]
                      .filter(Boolean)
                      .join(" ")}
                  </span>

                  <span className="portal-list-sub">
                    {record.role} · {record.email}
                  </span>
                </span>

                <span className="portal-list-side">
                  <span className="portal-list-status">
                    {record.submission_status}
                  </span>

                  <span className="portal-list-sub">
                    {formatDate(
                      record.completed_at ??
                        record.registration_submitted_at ??
                        record.created_at,
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PortalPage>
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
    return <span className="portal-chip portal-chip--empty">{label} — none</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="portal-chip"
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
