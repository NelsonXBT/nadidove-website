import { NextResponse } from "next/server";

import { canReadRegistration, hasRecordsAccess } from "@/lib/staff/auth";
import {
  SetupError,
  getAcceptanceForStaffMember,
  getStaffMember,
} from "@/lib/staff/db";
import { signedUrl } from "@/lib/staff/storage";

/**
 * One registration, read back in full.
 *
 * Serves both the completion screen — where the person who just submitted sees
 * a summary of what was filed — and the staff records screen. Access is decided
 * by `canReadRegistration`: your own submission, or records access.
 *
 * Document links are short-lived signed URLs minted here, and only for a reader
 * holding records access. The submitter already has their own documents; the
 * point of the signed URLs is to let the founder open an ID scan without the
 * bucket ever being public.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!(await canReadRegistration(id))) {
    // The same answer as a genuinely missing record: a distinct "forbidden"
    // would confirm that this id names a real registration.
    return NextResponse.json(
      { success: false, error: "This registration is not available." },
      { status: 404 },
    );
  }

  try {
    const record = await getStaffMember(id);

    if (!record) {
      return NextResponse.json(
        { success: false, error: "This registration is not available." },
        { status: 404 },
      );
    }

    const acceptance = await getAcceptanceForStaffMember(record.id);

    const documents = (await hasRecordsAccess())
      ? {
          passport: await signedUrl(record.passport_file_path),
          government_id: await signedUrl(record.government_id_file_path),
          signature: await signedUrl(record.signature_file_path),
        }
      : null;

    return NextResponse.json(
      {
        success: true,
        data: {
          ...record,
          acceptance,
          documents,
          has_completed_pdf: Boolean(record.completed_pdf_file_path),
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof SetupError) {
      return NextResponse.json(
        { success: false, error: error.message, setup_required: true },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load this registration.",
      },
      { status: 500 },
    );
  }
}
