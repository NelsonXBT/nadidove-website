"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import PortalPage, {
  PortalGroup,
  PortalHead,
  PortalRow,
} from "@/components/staff/PortalPage";
import { AGREEMENT_TITLE } from "@/lib/staff/agreement";
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
    <PortalPage>
      <PortalHead
        eyebrow="Registration complete"
        title={
          submission ? `Thank you, ${submission.first_name}.` : "Thank you."
        }
      >
        <p className="portal-lead">
          Your registration has been submitted and your copy of the{" "}
          {AGREEMENT_TITLE} has been issued. Please download or print it for
          your records.
        </p>
      </PortalHead>

      {error && (
        <div role="alert" className="portal-notice">
          {error}
        </div>
      )}

      {submission && (
        <>
          <PortalGroup title="Your record">
            <PortalRow
              label="Name"
              value={[
                submission.first_name,
                submission.middle_name,
                submission.last_name,
              ]
                .filter(Boolean)
                .join(" ")}
            />

            <PortalRow label="Role" value={submission.role} />
            <PortalRow label="Email" value={submission.email} />

            {submission.acceptance && (
              <>
                <PortalRow
                  label="Agreement version"
                  value={submission.acceptance.agreement_version}
                />

                <PortalRow
                  label="Accepted"
                  value={formatDateTime(submission.acceptance.accepted_at)}
                />
              </>
            )}

            <PortalRow
              label="Submitted"
              value={formatDateTime(
                submission.completed_at ??
                  submission.registration_submitted_at,
              )}
            />

            <PortalRow label="Reference" value={submission.id} />
          </PortalGroup>

          {submission.has_completed_pdf && pdfUrl ? (
            <section className="portal-block">
              <h2 className="portal-block-title">Your agreement</h2>

              <p className="portal-block-text">
                This copy contains the full agreement, your registration
                details, your signature and your documents.
              </p>

              <div className="portal-actions">
                <a
                  href={`${pdfUrl}?download`}
                  className="button button--primary"
                >
                  Download PDF
                </a>

                <button
                  type="button"
                  onClick={printAgreement}
                  className="button button--secondary"
                >
                  Print
                </button>

                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--text"
                >
                  Open in new tab →
                </a>
              </div>

              <div className="portal-pdf">
                <iframe
                  ref={previewRef}
                  src={pdfUrl}
                  title="Your completed agreement"
                />
              </div>
            </section>
          ) : (
            <div className="portal-block">
              <p className="portal-block-text">
                Your registration was saved, but the agreement PDF is not
                available for download yet. Please contact Nadidove with
                reference {submission.id}.
              </p>
            </div>
          )}

          <div className="portal-block portal-block--tight">
            <p className="portal-note">
              Keep your reference number. Nadidove holds a copy of this
              registration and your agreement on file.
            </p>
          </div>
        </>
      )}

      {!submission && !error && (
        <p className="portal-note">Loading your agreement…</p>
      )}
    </PortalPage>
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
