import { NextResponse } from "next/server";

import { grantSubmissionAccess } from "@/lib/staff/auth";
import {
  SetupError,
  deleteStaffMember,
  ensureActiveAgreement,
  insertStaffMember,
  recordAgreementAcceptance,
  updateStaffMember,
} from "@/lib/staff/db";
import { buildCompletedAgreementPdf, completedPdfFileName } from "@/lib/staff/pdf";
import {
  type RegistrationFormData,
  type UploadData,
  decodeUpload,
  emptyRegistration,
  fullName,
  normaliseRegistration,
  validateRegistration,
} from "@/lib/staff/registration";
import {
  completedPdfPath,
  documentPath,
  removeRegistrationFiles,
  uploadCompletedPdf,
  uploadDocument,
} from "@/lib/staff/storage";

/**
 * Completes a registration.
 *
 * Everything happens in one request so a staff member is never left half
 * registered: the record is written, the three documents are filed, the
 * agreement acceptance is recorded, and the completed PDF is generated and
 * stored. If any step after the insert fails, the record and its files are
 * removed again — the browser still holds the form, so a retry starts clean
 * rather than leaving an orphan behind.
 */
export async function POST(request: Request) {
  let staffId: string | null = null;

  try {
    const body = await request.json();

    const registration = coerceRegistration(body?.registration ?? body);

    const problems = validateRegistration(registration);

    if (problems.length > 0) {
      return NextResponse.json(
        { success: false, error: problems[0], errors: problems },
        { status: 400 },
      );
    }

    // Present because validation passed — narrowed for the code below.
    const passport = registration.passport as UploadData;
    const governmentId = registration.government_id as UploadData;
    const signature = registration.signature as UploadData;

    /*
     * Decode before writing anything. A file that turns out to be unreadable
     * should be reported as a form problem, not as a failed submission that
     * has already left a row in the database.
     */
    const decoded = {
      passport: decodeUpload(passport, "Passport photograph"),
      governmentId: decodeUpload(governmentId, "Government ID"),
      signature: decodeUpload(signature, "Signature"),
    };

    const agreement = await ensureActiveAgreement();

    const submittedAt = new Date().toISOString();
    const acceptedAt = resolveAcceptedAt(body?.agreement_accepted_at, submittedAt);

    const normalised = normaliseRegistration(registration);

    const record = await insertStaffMember(normalised, submittedAt);
    staffId = record.id;

    const [passportPath, governmentIdPath, signaturePath] = await Promise.all([
      uploadDocument(
        documentPath(record.id, "passport", decoded.passport.contentType),
        decoded.passport,
      ),
      uploadDocument(
        documentPath(record.id, "government-id", decoded.governmentId.contentType),
        decoded.governmentId,
      ),
      uploadDocument(
        documentPath(record.id, "signature", decoded.signature.contentType),
        decoded.signature,
      ),
    ]);

    const { acceptance } = await recordAgreementAcceptance(
      record.id,
      agreement.id,
      agreement.version,
      acceptedAt,
    );

    const pdf = await buildCompletedAgreementPdf({
      staffId: record.id,
      registration: normalised,
      passport,
      governmentId,
      signature,
      acceptedAt: acceptance.accepted_at,
      submittedAt,
    });

    const person = fullName(registration);

    const pdfPath = await uploadCompletedPdf(
      completedPdfPath(record.id, completedPdfFileName(person, record.id)),
      pdf,
    );

    const completed = await updateStaffMember(record.id, {
      passport_file_path: passportPath,
      government_id_file_path: governmentIdPath,
      signature_file_path: signaturePath,
      completed_pdf_file_path: pdfPath,
      submission_status: "completed",
      completed_at: new Date().toISOString(),
    });

    // Lets this browser reopen its own completion screen and download its own
    // PDF, without opening the record to anyone else who learns the id.
    await grantSubmissionAccess(record.id);

    return NextResponse.json(
      {
        success: true,
        message: "Registration submitted successfully.",
        data: {
          id: completed.id,
          full_name: person,
          email: completed.email,
          submission_status: completed.submission_status,
          submitted_at: completed.registration_submitted_at,
          completed_at: completed.completed_at,
          agreement_version: acceptance.agreement_version,
          accepted_at: acceptance.accepted_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    // Undo a partial submission so the retry is a clean one.
    if (staffId) {
      await rollback(staffId);
    }

    if (error instanceof SetupError) {
      return NextResponse.json(
        { success: false, error: error.message, setup_required: true },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { success: false, error: explain(error) },
      { status: 400 },
    );
  }
}

async function rollback(staffId: string): Promise<void> {
  try {
    await removeRegistrationFiles(staffId);
    await deleteStaffMember(staffId);
  } catch {
    // Nothing useful to do here: the original failure is what gets reported,
    // and the leftover row stays visible in the staff records either way.
  }
}

/**
 * Turns a database or upload failure into something a person can act on.
 * Constraint names are matched because Postgres reports them verbatim and they
 * are the only reliable signal of which rule was broken.
 */
function explain(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unable to submit your registration. Please try again.";
  }

  const message = error.message;

  if (message.includes("education_other_required")) {
    return "Please specify your education before submitting.";
  }

  if (message.includes("staff_members_education_check")) {
    return "Please choose one of the listed education options.";
  }

  if (message.includes("date_of_birth")) {
    return "Please enter a valid date of birth.";
  }

  return message || "Unable to submit your registration. Please try again.";
}

/**
 * The moment the agreement was accepted, as reported by the browser.
 *
 * Accepted only if it is a real timestamp that is not in the future and not
 * older than a day — a stale or tampered value would misdate the record on a
 * legal document, so anything implausible falls back to the submission time.
 */
function resolveAcceptedAt(value: unknown, submittedAt: string): string {
  if (typeof value !== "string") {
    return submittedAt;
  }

  const accepted = new Date(value);

  if (Number.isNaN(accepted.getTime())) {
    return submittedAt;
  }

  const submitted = new Date(submittedAt);
  const ageMs = submitted.getTime() - accepted.getTime();

  if (ageMs < 0 || ageMs > 24 * 60 * 60 * 1000) {
    return submittedAt;
  }

  return accepted.toISOString();
}

/**
 * Builds a registration out of an untrusted body: every known field is read as
 * the type the form produces, and anything else in the payload is dropped.
 */
function coerceRegistration(body: unknown): RegistrationFormData {
  const source = (body ?? {}) as Record<string, unknown>;

  const text = (key: keyof RegistrationFormData) => {
    const value = source[key];

    return typeof value === "string" ? value : "";
  };

  const upload = (key: keyof RegistrationFormData): UploadData | null => {
    const value = source[key];

    if (!value || typeof value !== "object") {
      return null;
    }

    const candidate = value as Partial<UploadData>;

    if (typeof candidate.data !== "string" || !candidate.data) {
      return null;
    }

    return {
      name: typeof candidate.name === "string" ? candidate.name : "upload",
      type: typeof candidate.type === "string" ? candidate.type : "",
      data: candidate.data,
    };
  };

  return {
    ...emptyRegistration,

    first_name: text("first_name"),
    middle_name: text("middle_name"),
    last_name: text("last_name"),
    date_of_birth: text("date_of_birth"),
    email: text("email"),
    phone_number: text("phone_number"),

    state_of_origin: text("state_of_origin"),
    current_state: text("current_state"),
    current_city: text("current_city"),

    role: text("role"),
    education: text("education"),
    education_other: text("education_other"),

    bank_name: text("bank_name"),
    account_number: text("account_number"),
    account_name: text("account_name"),

    passport: upload("passport"),
    government_id: upload("government_id"),
    signature: upload("signature"),
  };
}
