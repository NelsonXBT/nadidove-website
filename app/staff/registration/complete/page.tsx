"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import PortalHeader from "@/components/staff/PortalHeader";
import { SUBMITTED_ID_KEY } from "@/lib/staff/registration";

interface Submission {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  role: string;
  completed_at: string | null;
  registration_submitted_at: string | null;
  has_completed_pdf: boolean;
  acceptance: { agreement_version: string; accepted_at: string } | null;
}

/**
 * The last screen of the flow: confirmation, and the completed agreement.
 *
 * The record itself is re-read from the server rather than carried over from the
 * form, so what is shown here is what was actually stored. The PDF is streamed
 * from `/api/staff/[id]/pdf`, which the submitter can reach for a week via the
 * httpOnly cookie set at submission — long enough to come back for it later.
 */
export default function RegistrationCompletePage() {
  const router = useRouter();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState("");

  const previewRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const id = sessionStorage.getItem(SUBMITTED_ID_KEY);

    if (!id) {
      router.replace("/staff/registration");

      return;
    }

    let active = true;

    (async () => {
      try {
        const response = await fetch(`/api/staff/${id}`, { cache: "no-store" });
        const result = await response.json().catch(() => null);

        if (!active) {
          return;
        }

        if (!response.ok || !result?.success) {
          setError(
            result?.error ??
              "We could not load your submitted registration. Your registration was saved.",
          );

          return;
        }

        setSubmission(result.data as Submission);
      } catch {
        if (active) {
          setError(
            "We could not reach the server to load your registration. Your registration was saved.",
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  const pdfUrl = submission ? `/api/staff/${submission.id}/pdf` : null;

  /**
   * Prints the embedded copy where the browser allows it, and otherwise opens
   * the PDF in its own tab so the viewer's own print control can be used.
   */
  function printAgreement() {
    const frame = previewRef.current;

    try {
      if (frame?.contentWindow) {
        frame.contentWindow.focus();
        frame.contentWindow.print();

        return;
      }
    } catch {
      // Falls through to opening the PDF directly.
    }

    if (pdfUrl) {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
        <PortalHeader subtitle="Registration Complete" />

        <div className="mt-16">
          <p className="mb-5 text-xs uppercase tracking-[0.35em] text-[#D7192F]">
            Registration complete
          </p>

          <h1 className="text-4xl font-medium leading-tight tracking-tight md:text-5xl">
            {submission
              ? `Thank you, ${submission.first_name}.`
              : "Thank you."}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
            Your registration has been submitted and your copy of the Nadidove
            Films Team and Employment Agreement has been issued. Please download
            or print it for your records.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-10 border border-red-900 bg-red-950/30 px-5 py-4 text-sm leading-6 text-red-300"
          >
            {error}
          </div>
        )}

        {submission && (
          <>
            <section className="mt-14 border-t border-neutral-800 pt-8">
              <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Your record
              </h2>

              <dl className="mt-6 divide-y divide-neutral-900">
                <Row
                  label="Name"
                  value={[
                    submission.first_name,
                    submission.middle_name,
                    submission.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />

                <Row label="Role" value={submission.role} />
                <Row label="Email" value={submission.email} />

                {submission.acceptance && (
                  <>
                    <Row
                      label="Agreement version"
                      value={submission.acceptance.agreement_version}
                    />

                    <Row
                      label="Accepted"
                      value={formatDateTime(submission.acceptance.accepted_at)}
                    />
                  </>
                )}

                <Row
                  label="Submitted"
                  value={formatDateTime(
                    submission.completed_at ??
                      submission.registration_submitted_at,
                  )}
                />

                <Row label="Reference" value={submission.id} />
              </dl>
            </section>

            {submission.has_completed_pdf && pdfUrl ? (
              <section className="mt-14 border-t border-neutral-800 pt-8">
                <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                  Your agreement
                </h2>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-500">
                  This copy contains the full agreement, your registration
                  details, your signature and your documents.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <a
                    href={`${pdfUrl}?download`}
                    className="bg-[#D7192F] px-8 py-4 text-center text-sm uppercase tracking-[0.15em] text-white transition hover:bg-[#bd1529]"
                  >
                    Download PDF
                  </a>

                  <button
                    type="button"
                    onClick={printAgreement}
                    className="border border-neutral-700 px-8 py-4 text-sm uppercase tracking-[0.15em] text-white transition hover:border-neutral-400"
                  >
                    Print
                  </button>

                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-4 text-center text-sm uppercase tracking-[0.15em] text-neutral-500 transition hover:text-white"
                  >
                    Open in new tab →
                  </a>
                </div>

                <div className="mt-10 border border-neutral-800 bg-neutral-950">
                  <iframe
                    ref={previewRef}
                    src={pdfUrl}
                    title="Your completed agreement"
                    className="h-[36rem] w-full"
                  />
                </div>
              </section>
            ) : (
              submission && (
                <p className="mt-14 border-t border-neutral-800 pt-8 text-sm leading-7 text-neutral-500">
                  Your registration was saved, but the agreement PDF is not
                  available for download yet. Please contact Nadidove with
                  reference {submission.id}.
                </p>
              )
            )}

            <p className="mt-14 border-t border-neutral-800 pt-8 text-xs leading-6 text-neutral-600">
              Keep your reference number. Nadidove holds a copy of this
              registration and your agreement on file.
            </p>
          </>
        )}

        {!submission && !error && (
          <p className="mt-16 text-neutral-500">Loading your agreement…</p>
        )}
      </div>
    </main>
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

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })} at ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
