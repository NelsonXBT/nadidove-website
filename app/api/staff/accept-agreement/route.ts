import { NextResponse } from "next/server";

import { canReadRegistration } from "@/lib/staff/auth";
import {
  SetupError,
  getStaffMember,
  recordAgreementAcceptance,
} from "@/lib/staff/db";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Records that an existing staff member accepted an agreement.
 *
 * The registration flow records its own acceptance as part of submission — this
 * endpoint covers the separate case of an existing team member accepting a new
 * version of the agreement, which is why it takes an id rather than a form.
 *
 * Writing an acceptance is signing something: the row is what the studio would
 * point at to say a named person agreed to a specific version on a specific
 * date. So it is held to the same check as reading the record — the browser
 * that submitted this registration, or the founder holding records access.
 * Anything else and an id alone would be enough to sign on someone's behalf.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { staff_member_id, agreement_id } = body ?? {};

    if (!staff_member_id || !agreement_id) {
      return NextResponse.json(
        {
          success: false,
          error: "staff_member_id and agreement_id are required.",
        },
        { status: 400 },
      );
    }

    if (typeof staff_member_id !== "string") {
      return NextResponse.json(
        { success: false, error: "This registration is not available." },
        { status: 404 },
      );
    }

    /* Checked before anything is looked up, so an unauthorised caller cannot
       use the difference between "no such staff member" and "no such agreement"
       to test whether an id names a real registration. Same 404 as the read
       routes give, for the same reason. */
    if (!(await canReadRegistration(staff_member_id))) {
      return NextResponse.json(
        { success: false, error: "This registration is not available." },
        { status: 404 },
      );
    }

    const supabase = createAdminClient();

    const { data: agreement, error: agreementError } = await supabase
      .from("agreements")
      .select("id, title, version, is_active")
      .eq("id", agreement_id)
      .maybeSingle();

    if (agreementError) {
      return NextResponse.json(
        { success: false, error: agreementError.message },
        { status: 500 },
      );
    }

    if (!agreement) {
      return NextResponse.json(
        { success: false, error: "Agreement not found." },
        { status: 404 },
      );
    }

    if (!agreement.is_active) {
      return NextResponse.json(
        { success: false, error: "This agreement is no longer active." },
        { status: 400 },
      );
    }

    const staffMember = await getStaffMember(staff_member_id);

    if (!staffMember) {
      return NextResponse.json(
        { success: false, error: "This registration is not available." },
        { status: 404 },
      );
    }

    const { acceptance, alreadyAccepted } = await recordAgreementAcceptance(
      staffMember.id,
      agreement.id,
      agreement.version,
    );

    return NextResponse.json(
      {
        success: true,
        already_accepted: alreadyAccepted,
        message: alreadyAccepted
          ? "Agreement has already been accepted."
          : "Agreement accepted successfully.",
        data: acceptance,
      },
      { status: alreadyAccepted ? 200 : 201 },
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
        error: error instanceof Error ? error.message : "Invalid request.",
      },
      { status: 400 },
    );
  }
}
