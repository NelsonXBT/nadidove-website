import { canReadRegistration } from "@/lib/staff/auth";
import { SetupError, getStaffMember } from "@/lib/staff/db";
import { COMPLETED_BUCKET, downloadObject } from "@/lib/staff/storage";

/**
 * Streams the completed agreement PDF.
 *
 * The bucket is private, so the file is fetched with the service key and passed
 * through rather than handed out as a link — which keeps the download behind
 * the same check on every request instead of behind a URL that can be
 * forwarded. Readable by the browser that submitted the registration, and by
 * anyone holding records access.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!(await canReadRegistration(id))) {
    return Response.json(
      { success: false, error: "This registration is not available." },
      { status: 404 },
    );
  }

  let record;

  try {
    record = await getStaffMember(id);
  } catch (error) {
    const status = error instanceof SetupError ? 503 : 500;

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unable to load the record.",
      },
      { status },
    );
  }

  if (!record?.completed_pdf_file_path) {
    return Response.json(
      {
        success: false,
        error: "The completed agreement for this registration is not available.",
      },
      { status: 404 },
    );
  }

  const file = await downloadObject(
    record.completed_pdf_file_path,
    COMPLETED_BUCKET,
  );

  if (!file) {
    return Response.json(
      { success: false, error: "The completed agreement could not be read." },
      { status: 502 },
    );
  }

  const fileName =
    record.completed_pdf_file_path.split("/").pop() ?? "agreement.pdf";

  /*
   * `inline` unless the request asks otherwise, so the completion screen's
   * "View" opens the PDF in a tab while "Download" saves it.
   */
  const disposition = new URL(request.url).searchParams.has("download")
    ? "attachment"
    : "inline";

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${fileName}"`,
      "Content-Length": String(file.bytes.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
