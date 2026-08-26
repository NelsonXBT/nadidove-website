import { NextResponse } from "next/server";

import { SetupError, ensureActiveAgreement } from "@/lib/staff/db";

/**
 * The agreement a new registration must accept.
 *
 * The row is created from `lib/staff/agreement.ts` on first request, so there
 * is no seeding step to remember after a deploy and the wording on screen can
 * never disagree with the wording recorded against an acceptance.
 */
export async function GET() {
  try {
    const agreement = await ensureActiveAgreement();

    return NextResponse.json(
      { success: true, data: agreement },
      { headers: { "Cache-Control": "no-store" } },
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
            : "Unable to load the agreement.",
      },
      { status: 500 },
    );
  }
}
