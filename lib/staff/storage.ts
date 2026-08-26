/**
 * Storage paths and signed-URL access for staff documents.
 *
 * Both buckets are private. Nothing is ever served from a public URL — every
 * read goes through a short-lived signed URL minted server-side, so a document
 * link can't be forwarded and reused indefinitely.
 */

import { createAdminClient } from "@/lib/supabase/admin";

import { extensionFor, type DecodedUpload } from "./registration";

/** Identity documents supplied during registration. */
export const DOCUMENTS_BUCKET = "staff-documents";

/** Generated PDFs of completed agreements. */
export const COMPLETED_BUCKET = "completed-agreements";

export type DocumentKind = "passport" | "government-id" | "signature";

/** How long a signed document URL stays valid. */
const SIGNED_URL_TTL_SECONDS = 60 * 10;

/**
 * Documents are filed under the staff member's id. One folder per registration
 * keeps a person's documents together and makes a deletion request a single
 * prefix removal.
 */
export function documentPath(
  staffId: string,
  kind: DocumentKind,
  contentType: string,
): string {
  return `${staffId}/${kind}${extensionFor(contentType)}`;
}

export function completedPdfPath(staffId: string, fileName: string): string {
  return `${staffId}/${fileName}`;
}

export async function uploadDocument(
  path: string,
  decoded: DecodedUpload,
  bucket: string = DOCUMENTS_BUCKET,
): Promise<string> {
  const supabase = createAdminClient();

  const { error } = await supabase.storage.from(bucket).upload(path, decoded.bytes, {
    contentType: decoded.contentType,
    // A resubmission for the same record should replace the file rather than
    // accumulate copies under generated names.
    upsert: true,
  });

  if (error) {
    throw new Error(`Unable to store the uploaded file: ${error.message}`);
  }

  return path;
}

export async function uploadCompletedPdf(
  path: string,
  bytes: Uint8Array,
): Promise<string> {
  const supabase = createAdminClient();

  const { error } = await supabase.storage
    .from(COMPLETED_BUCKET)
    .upload(path, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`Unable to store the completed agreement: ${error.message}`);
  }

  return path;
}

/** A time-limited URL for one stored object, or `null` if it can't be signed. */
export async function signedUrl(
  path: string | null | undefined,
  bucket: string = DOCUMENTS_BUCKET,
): Promise<string | null> {
  if (!path) {
    return null;
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    return null;
  }

  return data.signedUrl;
}

/** The raw bytes of a stored object — used to stream a PDF download. */
export async function downloadObject(
  path: string,
  bucket: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error || !data) {
    return null;
  }

  return {
    bytes: new Uint8Array(await data.arrayBuffer()),
    contentType: data.type || "application/octet-stream",
  };
}

/** Removes every document filed under one registration. */
export async function removeRegistrationFiles(staffId: string): Promise<void> {
  const supabase = createAdminClient();

  for (const bucket of [DOCUMENTS_BUCKET, COMPLETED_BUCKET]) {
    const { data } = await supabase.storage.from(bucket).list(staffId);

    if (!data?.length) {
      continue;
    }

    await supabase.storage
      .from(bucket)
      .remove(data.map((file) => `${staffId}/${file.name}`));
  }
}
