/**
 * Database access for the registration portal.
 *
 * Every table here has row level security on with no policies attached, so the
 * anon key cannot read or write any of it. All access runs through the service
 * key from server code — which is what keeps banking details, identity
 * documents and contact information out of reach of the browser.
 */

import { createAdminClient } from "@/lib/supabase/admin";

import {
  AGREEMENT_TITLE,
  AGREEMENT_VERSION,
  agreementPlainText,
  type AgreementRecord,
} from "./agreement";
import type { NormalisedRegistration } from "./registration";

/**
 * Raised when the database rejects a query for a reason the operator has to
 * fix, rather than something the applicant can correct by editing the form.
 */
export class SetupError extends Error {}

/**
 * The admin client, but only once the credentials it needs are actually
 * present.
 *
 * Without this, a deployment missing its environment variables reaches
 * `createClient()` and fails with supabase-js's own "supabaseUrl is required" —
 * which surfaces on the registration screen as a stray library error rather
 * than something the operator can act on. Naming the missing variables turns it
 * into an instruction.
 */
function adminClient() {
  const missing = (
    [
      ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
      ["SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY],
    ] as const
  )
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new SetupError(
      `The staff portal is not connected to its database: ${missing.join(
        " and ",
      )} ${missing.length === 1 ? "is" : "are"} not set on the server.`,
    );
  }

  return createAdminClient();
}

/**
 * Supabase projects no longer grant the Data API roles access to new tables
 * automatically, so a freshly-pushed migration answers every query with
 * `42501 permission denied`. That looks like a bug in the portal from the
 * outside, so it is named for what it is.
 */
function assertUsable(error: { code?: string; message: string } | null): void {
  if (!error) {
    return;
  }

  if (error.code === "42501") {
    throw new SetupError(
      "The database has not granted access to the staff registration tables. " +
        "Apply the latest migration in supabase/migrations, then try again.",
    );
  }

  if (error.code === "42P01") {
    throw new SetupError(
      "The staff registration tables do not exist yet. " +
        "Apply the migrations in supabase/migrations, then try again.",
    );
  }
}

/* ------------------------------------------------------------------
   Agreements
------------------------------------------------------------------ */

/**
 * The agreement row for the current version, created on first use.
 *
 * `lib/staff/agreement.ts` is the source of truth for the wording; this row
 * exists so an acceptance can reference it by id and so the database holds a
 * literal copy of the text that was accepted. Seeding on demand means there is
 * no separate step to remember after a deploy — and if the wording is edited
 * without bumping the version, the stored copy is corrected to match.
 */
export async function ensureActiveAgreement(): Promise<AgreementRecord> {
  const supabase = adminClient();
  const content = agreementPlainText();

  const { data: existing, error: readError } = await supabase
    .from("agreements")
    .select("id, title, version, content, is_active")
    .eq("version", AGREEMENT_VERSION)
    .maybeSingle();

  assertUsable(readError);

  if (readError) {
    throw new Error(readError.message);
  }

  if (existing) {
    const stale =
      existing.content !== content ||
      existing.title !== AGREEMENT_TITLE ||
      !existing.is_active;

    if (!stale) {
      return existing as AgreementRecord;
    }

    const { data: updated, error: updateError } = await supabase
      .from("agreements")
      .update({ title: AGREEMENT_TITLE, content, is_active: true })
      .eq("id", existing.id)
      .select("id, title, version, content, is_active")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updated as AgreementRecord;
  }

  // A new version supersedes its predecessors: older rows stop being offered
  // but stay readable, because acceptances still point at them.
  const { error: retireError } = await supabase
    .from("agreements")
    .update({ is_active: false })
    .eq("is_active", true)
    .neq("version", AGREEMENT_VERSION);

  assertUsable(retireError);

  const { data: inserted, error: insertError } = await supabase
    .from("agreements")
    .insert({
      title: AGREEMENT_TITLE,
      version: AGREEMENT_VERSION,
      content,
      is_active: true,
    })
    .select("id, title, version, content, is_active")
    .single();

  assertUsable(insertError);

  if (insertError) {
    throw new Error(insertError.message);
  }

  return inserted as AgreementRecord;
}

/* ------------------------------------------------------------------
   Agreement acceptances
------------------------------------------------------------------ */

export interface AcceptanceRecord {
  id: string;
  staff_member_id: string;
  agreement_id: string;
  agreement_version: string;
  accepted_at: string;
}

const ACCEPTANCE_COLUMNS =
  "id, staff_member_id, agreement_id, agreement_version, accepted_at";

/**
 * Records that a staff member accepted an agreement, returning the existing
 * row if they already had. The table's unique constraint on
 * (staff_member_id, agreement_id) makes this safe to call twice.
 */
export async function recordAgreementAcceptance(
  staffMemberId: string,
  agreementId: string,
  agreementVersion: string,
  acceptedAt?: string,
): Promise<{ acceptance: AcceptanceRecord; alreadyAccepted: boolean }> {
  const supabase = adminClient();

  const { data: existing, error: readError } = await supabase
    .from("staff_agreement_acceptances")
    .select(ACCEPTANCE_COLUMNS)
    .eq("staff_member_id", staffMemberId)
    .eq("agreement_id", agreementId)
    .maybeSingle();

  assertUsable(readError);

  if (readError) {
    throw new Error(readError.message);
  }

  if (existing) {
    return { acceptance: existing as AcceptanceRecord, alreadyAccepted: true };
  }

  const { data, error } = await supabase
    .from("staff_agreement_acceptances")
    .insert({
      staff_member_id: staffMemberId,
      agreement_id: agreementId,
      agreement_version: agreementVersion,
      ...(acceptedAt ? { accepted_at: acceptedAt } : {}),
    })
    .select(ACCEPTANCE_COLUMNS)
    .single();

  assertUsable(error);

  if (error) {
    throw new Error(error.message);
  }

  return { acceptance: data as AcceptanceRecord, alreadyAccepted: false };
}

/* ------------------------------------------------------------------
   Staff members
------------------------------------------------------------------ */

export type SubmissionStatus = "draft" | "submitted" | "completed";

export interface StaffMemberRecord extends NormalisedRegistration {
  id: string;
  passport_file_path: string | null;
  government_id_file_path: string | null;
  signature_file_path: string | null;
  signature_date: string | null;
  submission_status: SubmissionStatus;
  registration_submitted_at: string | null;
  completed_at: string | null;
  completed_pdf_file_path: string | null;
  created_at: string;
  updated_at: string;
}

const STAFF_COLUMNS = `
  id,
  first_name, middle_name, last_name,
  date_of_birth, email, phone_number,
  state_of_origin, current_state, current_city,
  role, education, education_other,
  bank_name, account_number, account_name,
  passport_file_path, government_id_file_path, signature_file_path,
  signature_date,
  submission_status, registration_submitted_at, completed_at,
  completed_pdf_file_path,
  created_at, updated_at
`;

export async function insertStaffMember(
  registration: NormalisedRegistration,
  submittedAt: string,
): Promise<StaffMemberRecord> {
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("staff_members")
    .insert({
      ...registration,
      submission_status: "submitted",
      registration_submitted_at: submittedAt,
      signature_date: submittedAt.slice(0, 10),
    })
    .select(STAFF_COLUMNS)
    .single();

  assertUsable(error);

  if (error) {
    throw new Error(error.message);
  }

  return data as StaffMemberRecord;
}

export async function updateStaffMember(
  id: string,
  patch: Record<string, unknown>,
): Promise<StaffMemberRecord> {
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("staff_members")
    .update(patch)
    .eq("id", id)
    .select(STAFF_COLUMNS)
    .single();

  assertUsable(error);

  if (error) {
    throw new Error(error.message);
  }

  return data as StaffMemberRecord;
}

export async function deleteStaffMember(id: string): Promise<void> {
  const supabase = adminClient();

  const { error } = await supabase.from("staff_members").delete().eq("id", id);

  assertUsable(error);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getStaffMember(
  id: string,
): Promise<StaffMemberRecord | null> {
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("staff_members")
    .select(STAFF_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  assertUsable(error);

  if (error) {
    throw new Error(error.message);
  }

  return (data as StaffMemberRecord | null) ?? null;
}

export interface StaffListEntry {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  submission_status: SubmissionStatus;
  registration_submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/** Every registration, newest first. Reads only what the list needs. */
export async function listStaffMembers(): Promise<StaffListEntry[]> {
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("staff_members")
    .select(
      "id, first_name, middle_name, last_name, email, phone_number, role, submission_status, registration_submitted_at, completed_at, created_at",
    )
    .order("created_at", { ascending: false });

  assertUsable(error);

  if (error) {
    throw new Error(error.message);
  }

  return (data as StaffListEntry[] | null) ?? [];
}

/** The acceptance attached to one registration, if there is one. */
export async function getAcceptanceForStaffMember(
  staffMemberId: string,
): Promise<AcceptanceRecord | null> {
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("staff_agreement_acceptances")
    .select(ACCEPTANCE_COLUMNS)
    .eq("staff_member_id", staffMemberId)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  assertUsable(error);

  if (error) {
    throw new Error(error.message);
  }

  return (data as AcceptanceRecord | null) ?? null;
}
