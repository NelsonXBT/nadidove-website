import { NextResponse } from "next/server";

import { SetupError, ensureActiveAgreement } from "@/lib/staff/db";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every active agreement, newest first.
 *
 * `/api/agreements/active` is what the registration flow uses; this stays as
 * the list view for checking what versions exist. The active row is ensured
 * first so a fresh database answers with the current agreement rather than an
 * empty list.
 */
export async function GET() {
  try {
    await ensureActiveAgreement();

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("agreements")
      .select("id, title, version, content, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data },
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
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
