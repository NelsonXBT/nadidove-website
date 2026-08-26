import RegistrationFlow from "@/components/staff/RegistrationFlow";

/**
 * The staff registration portal.
 *
 * `?edit=true` is how the review screen sends someone back to change an answer.
 * It is read here, on the server, and handed to the flow as a boolean — the
 * documented alternative to `useSearchParams`, which would otherwise require
 * the whole client flow to sit inside a Suspense boundary.
 */
export default async function StaffRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { edit } = await searchParams;

  return <RegistrationFlow isEditMode={edit === "true"} />;
}
