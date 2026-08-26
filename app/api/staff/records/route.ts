import { NextResponse } from "next/server";

import { hasRecordsAccess, isRecordsAccessConfigured } from "@/lib/staff/auth";
import { SetupError, listStaffMembers } from "@/lib/staff/db";

/**
 * Every registration, newest first — the founder's list view.
 *
 * Deliberately narrow: names, contact details, role and status, but no banking
 * details and no documents. Those come from `/api/staff/[id]` when a specific
 * record is opened, so a listing left open on screen isn't a page full of
 * account numbers.
 */
export async function GET() {
  if (!(await hasRecordsAccess())) {
    return NextResponse.json(
      {
        success: false,
        error: "Enter the staff portal passcode to view registrations.",
        // Lets the screen say "not configured" rather than "wrong passcode"
        // when the server has no passcode set at all.
        locked: true,
        configured: isRecordsAccessConfigured(),
      },
      { status: 401 },
    );
  }

  try {
    const records = await listStaffMembers();

    return NextResponse.json(
      { success: true, data: records },
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
            : "Unable to load the registrations.",
      },
      { status: 500 },
    );
  }
}
