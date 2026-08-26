"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import PortalHeader from "@/components/staff/PortalHeader";
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
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
        <PortalHeader />

        <div className="mt-16">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-neutral-500">
            Review
          </p>

          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            Review your registration
          </h1>

          <p className="mt-6 max-w-2xl leading-8 text-neutral-400">
            Check everything below carefully. You can still make changes — once
            you submit, your agreement is issued with these details.
          </p>
        </div>

        {errors.length > 0 && (
          <div
            role="alert"
            className="mt-8 border border-red-900 bg-red-950/30 px-5 py-4 text-sm leading-6 text-red-300"
          >
            {errors.length === 1 ? (
              errors[0]
            ) : (
              <ul className="space-y-1">
                {errors.map((message) => (
                  <li key={message}>• {message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-16 space-y-14">
          <Section number="01" title="Personal Information">
            <Row label="First Name" value={formData.first_name} />
            <Row label="Middle Name" value={formData.middle_name} />
            <Row label="Last Name / Surname" value={formData.last_name} />
            <Row
              label="Date of Birth"
              value={formatDate(formData.date_of_birth)}
            />
            <Row label="Email Address" value={formData.email} />
            <Row label="Phone Number" value={formData.phone_number} />
          </Section>

          <Section number="02" title="Professional Information">
            <Row label="State of Origin" value={formData.state_of_origin} />
            <Row label="Current State" value={formData.current_state} />
            <Row label="Current City" value={formData.current_city} />
            <Row label="Role at Nadidove" value={formData.role} />
            <Row label="Education" value={education} />
          </Section>

          <Section number="03" title="Payment Information">
            <Row label="Bank Name" value={formData.bank_name} />
            <Row label="Account Number" value={formData.account_number} />
            <Row label="Account Name" value={formData.account_name} />
          </Section>

          <section className="border-t border-neutral-800 pt-8">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Section 04
              </p>

              <h2 className="mt-2 text-2xl font-medium">Required Documents</h2>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              <Document label="Passport Photograph" upload={formData.passport} />
              <Document label="Government ID" upload={formData.government_id} />
              <Document label="Signature" upload={formData.signature} />
            </div>
          </section>
        </div>

        <section className="mt-16 border-t border-neutral-800 pt-10">
          <p className="max-w-2xl text-sm leading-7 text-neutral-500">
            By submitting, you confirm that the information above is accurate and
            belongs to you, and that you accept the Nadidove Films Team and
            Employment Agreement you reviewed.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={editRegistration}
              disabled={submitting}
              className="border border-neutral-700 px-8 py-4 text-sm uppercase tracking-[0.15em] text-white transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={submitRegistration}
              disabled={submitting}
              className="bg-[#D7192F] px-8 py-4 text-sm uppercase tracking-[0.15em] text-white transition hover:bg-[#bd1529] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit →"}
            </button>
          </div>

          {submitting && (
            <p className="mt-5 text-xs leading-6 text-neutral-500">
              Filing your documents and preparing your agreement. This can take a
              few moments — please don&apos;t close this page.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function Loading() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
        <PortalHeader />

        <p className="mt-20 text-neutral-500">Loading your registration…</p>
      </div>
    </main>
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

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-neutral-800 pt-8">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          Section {number}
        </p>

        <h2 className="mt-2 text-2xl font-medium">{title}</h2>
      </div>

      <dl className="divide-y divide-neutral-900">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
      <dt className="text-xs uppercase tracking-[0.15em] text-neutral-500">
        {label}
      </dt>

      <dd className="break-words text-white">{value.trim() || "—"}</dd>
    </div>
  );
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
      <p className="mb-3 text-xs uppercase tracking-[0.15em] text-neutral-500">
        {label}
      </p>

      {!upload ? (
        <div className="flex h-48 items-center justify-center border border-neutral-800 bg-neutral-950 text-sm text-neutral-600">
          No file provided
        </div>
      ) : upload.type.startsWith("image/") ? (
        <div className="flex h-48 items-center justify-center border border-neutral-800 bg-neutral-950 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- a data URL held
              in the browser, with no origin for the image optimiser to fetch. */}
          <img
            src={upload.data}
            alt={label}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex h-48 flex-col items-center justify-center border border-neutral-800 bg-neutral-950 px-5 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center border border-neutral-700 text-xs tracking-[0.1em] text-neutral-400">
            PDF
          </span>

          <p className="truncate text-sm text-neutral-300">{upload.name}</p>

          <a
            href={upload.data}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-xs uppercase tracking-[0.15em] text-[#D7192F] transition hover:text-white"
          >
            Open →
          </a>
        </div>
      )}
    </div>
  );
}
