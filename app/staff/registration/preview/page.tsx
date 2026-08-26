"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import PortalPage, {
  PortalGroup,
  PortalHead,
  PortalRow,
} from "@/components/staff/PortalPage";
import { AGREEMENT_TITLE } from "@/lib/staff/agreement";
import { readAcceptedDraft, useIsHydrated } from "@/lib/staff/draft";
import {
  AGREEMENT_ACCEPTED_AT_KEY,
  type RegistrationFormData,
  STORAGE_KEY,
  SUBMITTED_ID_KEY,
  type UploadData,
  validateRegistration,
} from "@/lib/staff/registration";

/**
 * The review screen.
 *
 * Everything shown here comes from the draft the form saved on its way over,
 * which only the browser holds — so the summary waits for hydration and is then
 * mounted with the draft already read.
 */
export default function StaffRegistrationPreview() {
  const hydrated = useIsHydrated();

  if (!hydrated) {
    return <Loading />;
  }

  return <Review />;
}

function Review() {
  const router = useRouter();

  /*
   * Read once and never changed here: this screen shows the answers and submits
   * them, and sends the applicant back to the form to alter any of them.
   */
  const [formData] = useState<RegistrationFormData | null>(readAcceptedDraft);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  /* ------------------------------------------------------------
     No draft

     The session expired, or this URL was opened directly. Either way
     there is nothing to review, so the flow restarts rather than
     showing an empty summary.
  ------------------------------------------------------------ */

  useEffect(() => {
    if (!formData) {
      router.replace("/staff/registration");
    }
  }, [formData, router]);

  const editRegistration = useCallback(() => {
    // The draft stays in sessionStorage; `edit=true` skips welcome and agreement.
    router.push("/staff/registration?edit=true");
  }, [router]);

  /* ------------------------------------------------------------
     Submit

     One request writes the record, files the three documents, records
     the agreement acceptance and generates the PDF. It either does all
     of that or rolls itself back, so a failure here is always safe to
     retry — the draft is still in the browser.
  ------------------------------------------------------------ */

  async function submitRegistration() {
    if (!formData || submitting) {
      return;
    }

    const problems = validateRegistration(formData);

    if (problems.length > 0) {
      setErrors(problems);
      window.scrollTo({ top: 0, behavior: "smooth" });

      return;
    }

    setErrors([]);
    setSubmitting(true);

    try {
      const response = await fetch("/api/staff/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration: formData,
          agreement_accepted_at:
            sessionStorage.getItem(AGREEMENT_ACCEPTED_AT_KEY) ?? undefined,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setErrors(
          Array.isArray(result?.errors) && result.errors.length > 0
            ? result.errors
            : [
                result?.error ??
                  "Your registration could not be submitted. Please try again.",
              ],
        );

        window.scrollTo({ top: 0, behavior: "smooth" });

        return;
      }

      /*
       * The record is written and the PDF is stored, so the draft has done its
       * job. Keeping only the id means a reload of the completion screen can
       * still fetch the PDF, while the documents no longer sit in the browser.
       */
      sessionStorage.setItem(SUBMITTED_ID_KEY, result.data.id);
      sessionStorage.removeItem(STORAGE_KEY);

      router.push("/staff/registration/complete");
    } catch {
      setErrors([
        "We could not reach the server. Please check your connection and try again.",
      ]);

      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!formData) {
    return <Loading />;
  }

  const education =
    formData.education === "Other" && formData.education_other.trim()
      ? `Other — ${formData.education_other.trim()}`
      : formData.education;

  return (
    <PortalPage>
      <PortalHead eyebrow="Review" title="Review your registration">
        <p className="portal-lead">
          Check everything below carefully. You can still make changes — once you
          submit, your agreement is issued with these details.
        </p>
      </PortalHead>

      {errors.length > 0 && (
        <div role="alert" className="portal-notice">
          {errors.length === 1 ? (
            errors[0]
          ) : (
            <ul>
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <PortalGroup label="Section 01" title="Personal Information">
        <PortalRow label="First Name" value={formData.first_name} />
        <PortalRow label="Middle Name" value={formData.middle_name} />
        <PortalRow label="Last Name / Surname" value={formData.last_name} />
        <PortalRow
          label="Date of Birth"
          value={formatDate(formData.date_of_birth)}
        />
        <PortalRow label="Email Address" value={formData.email} />
        <PortalRow label="Phone Number" value={formData.phone_number} />
      </PortalGroup>

      <PortalGroup label="Section 02" title="Professional Information">
        <PortalRow label="State of Origin" value={formData.state_of_origin} />
        <PortalRow label="Current State" value={formData.current_state} />
        <PortalRow label="Current City" value={formData.current_city} />
        <PortalRow label="Role at Nadidove" value={formData.role} />
        <PortalRow label="Education" value={education} />
      </PortalGroup>

      <PortalGroup label="Section 03" title="Payment Information">
        <PortalRow label="Bank Name" value={formData.bank_name} />
        <PortalRow label="Account Number" value={formData.account_number} />
        <PortalRow label="Account Name" value={formData.account_name} />
      </PortalGroup>

      <section className="portal-block">
        <span className="portal-block-label">Section 04</span>

        <h2 className="portal-block-title">Required Documents</h2>

        <div className="portal-thumbs">
          <Document label="Passport Photograph" upload={formData.passport} />
          <Document label="Government ID" upload={formData.government_id} />
          <Document label="Signature" upload={formData.signature} />
        </div>
      </section>

      <section className="portal-block">
        <p className="portal-block-text">
          By submitting, you confirm that the information above is accurate and
          belongs to you, and that you accept the {AGREEMENT_TITLE} you reviewed.
        </p>

        <div className="portal-actions">
          <button
            type="button"
            onClick={editRegistration}
            disabled={submitting}
            className="button button--secondary"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={submitRegistration}
            disabled={submitting}
            className="button button--primary"
          >
            {submitting ? "Submitting…" : "Submit"}
            {!submitting && <span aria-hidden="true">→</span>}
          </button>
        </div>

        {submitting && (
          <p className="portal-note">
            Filing your documents and preparing your agreement. This can take a
            few moments — please don&apos;t close this page.
          </p>
        )}
      </section>
    </PortalPage>
  );
}

function Loading() {
  return (
    <PortalPage>
      <PortalHead eyebrow="Review" title="Loading your registration…" />
    </PortalPage>
  );
}

function formatDate(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Document({
  label,
  upload,
}: {
  label: string;
  upload: UploadData | null;
}) {
  return (
    <div>
      <p className="portal-thumb-label">{label}</p>

      <div className="portal-thumb-frame">
        {!upload ? (
          "No file provided"
        ) : upload.type.startsWith("image/") ? (
          /* eslint-disable-next-line @next/next/no-img-element -- a data URL held
             in the browser, with no origin for the image optimiser to fetch. */
          <img src={upload.data} alt={label} />
        ) : (
          <>
            <span className="portal-thumb-file">{upload.name}</span>

            <a
              href={upload.data}
              target="_blank"
              rel="noopener noreferrer"
              className="portal-chip"
            >
              Open →
            </a>
          </>
        )}
      </div>
    </div>
  );
}
