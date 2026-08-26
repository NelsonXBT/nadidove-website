import { NextResponse } from "next/server";

import {
  checkPasscode,
  grantRecordsAccess,
  isRecordsAccessConfigured,
  revokeRecordsAccess,
} from "@/lib/staff/auth";

/** Unlocks the staff records screen with the portal passcode. */
export async function POST(request: Request) {
  if (!isRecordsAccessConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Staff records are locked because STAFF_PORTAL_PASSCODE is not set on the server.",
      },
      { status: 503 },
    );
  }

  let passcode = "";

  try {
    const body = await request.json();

    passcode = typeof body?.passcode === "string" ? body.passcode : "";
  } catch {
    passcode = "";
  }

  if (!checkPasscode(passcode)) {
    // One message for both an empty and a wrong passcode — a distinct "missing"
    // response would confirm which half of a guess was right.
    return NextResponse.json(
      { success: false, error: "That passcode is not correct." },
      { status: 401 },
    );
  }

  await grantRecordsAccess();

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  await revokeRecordsAccess();

  return NextResponse.json({ success: true });
}
