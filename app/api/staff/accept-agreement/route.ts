import { NextResponse } from "next/server";

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
        { success: false, error: "Staff member not found." },
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
