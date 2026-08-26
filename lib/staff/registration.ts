/**
 * Shapes and validation shared by the registration form, the review screen and
 * the submit route.
 *
 * The form and the API validate the same way against the same list of fields,
 * so a rule can't drift out of step between the browser and the server. The
 * server still treats every submission as untrusted and re-runs the whole set.
 */

/** A file the applicant picked, held as a data URL until submission. */
export interface UploadData {
  name: string;
  type: string;
  /** `data:<mime>;base64,<payload>` */
  data: string;
}

/**
 * The four values `staff_members.education` accepts. The column carries a
 * CHECK constraint listing exactly these, and requires `education_other` to be
 * filled in whenever "Other" is chosen — so the form offers a fixed choice
 * rather than free text that the database would reject.
 */
export const EDUCATION_OPTIONS = [
  "Graduate",
  "SSCE Holder",
  "Undergraduate",
  "Other",
] as const;

export type EducationOption = (typeof EDUCATION_OPTIONS)[number];

export interface RegistrationFormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  phone_number: string;

  passport: UploadData | null;

  state_of_origin: string;
  current_state: string;
  current_city: string;

  role: string;
  education: string;
  education_other: string;

  bank_name: string;
  account_number: string;
  account_name: string;

  government_id: UploadData | null;
  signature: UploadData | null;
}

export const emptyRegistration: RegistrationFormData = {
  first_name: "",
  middle_name: "",
  last_name: "",
  date_of_birth: "",
  email: "",
  phone_number: "",

  passport: null,

  state_of_origin: "",
  current_state: "",
  current_city: "",

  role: "",
  education: "",
  education_other: "",

  bank_name: "",
  account_number: "",
  account_name: "",

  government_id: null,
  signature: null,
};

/** sessionStorage keys. The registration draft survives the review round-trip. */
export const STORAGE_KEY = "nadidove_staff_registration";
export const AGREEMENT_ACCEPTED_KEY = "nadidove_staff_agreement_accepted";
export const AGREEMENT_VERSION_KEY = "nadidove_staff_agreement_version";

/**
 * When the "I Accept Agreement" button was clicked. Sent with the submission so
 * the acceptance record and the completed PDF carry the moment the person
 * actually accepted, rather than the moment they finished typing.
 */
export const AGREEMENT_ACCEPTED_AT_KEY = "nadidove_staff_agreement_accepted_at";

/** Set on submit so the completion screen can be reopened after a reload. */
export const SUBMITTED_ID_KEY = "nadidove_staff_submitted_id";

export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

/**
 * Ceiling on a single decoded upload, matched to the 10MB limit already set on
 * the storage bucket so a file can't pass validation here and then be rejected
 * on the way into Supabase.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/* ------------------------------------------------------------------
   The full name, assembled in one place

   It shows up on the review screen, in the PDF and in the storage
   paths, and a middle name is optional, so the join lives here rather
   than being re-done at each site.
------------------------------------------------------------------ */

export function fullName(
  person: Pick<
    RegistrationFormData,
    "first_name" | "middle_name" | "last_name"
  >,
): string {
  return [person.first_name, person.middle_name, person.last_name]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

/* ------------------------------------------------------------------
   Validation

   Grouped by the step that collects each field, so the form can ask
   "is step 2 complete?" and the server can ask "is all of it complete?"
   from the same rules.
------------------------------------------------------------------ */

export interface FieldRule {
  field: keyof RegistrationFormData;
  label: string;
}

export const STEP_FIELDS: Record<number, FieldRule[]> = {
  1: [
    { field: "first_name", label: "First name" },
    { field: "last_name", label: "Last name" },
    { field: "date_of_birth", label: "Date of birth" },
    { field: "email", label: "Email address" },
    { field: "phone_number", label: "Phone number" },
    { field: "passport", label: "Passport photograph" },
  ],
  2: [
    { field: "state_of_origin", label: "State of origin" },
    { field: "current_state", label: "Current state" },
    { field: "current_city", label: "Current city" },
    { field: "role", label: "Role" },
    { field: "education", label: "Education" },
  ],
  3: [
    { field: "bank_name", label: "Bank name" },
    { field: "account_number", label: "Account number" },
    { field: "account_name", label: "Account name" },
  ],
  4: [
    { field: "government_id", label: "Government ID" },
    { field: "signature", label: "Signature" },
  ],
};

export const TOTAL_STEPS = 4;

export const STEP_TITLES: Record<number, string> = {
  1: "Personal Information",
  2: "Professional Information",
  3: "Payment Information",
  4: "Required Documents",
};

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  return typeof value === "string" && value.trim() === "";
}

/**
 * Everything wrong with one step, as messages meant to be read by the person
 * filling the form. An empty array means the step is complete.
 */
export function validateStep(
  step: number,
  data: RegistrationFormData,
): string[] {
  const errors: string[] = [];

  for (const { field, label } of STEP_FIELDS[step] ?? []) {
    if (isBlank(data[field])) {
      errors.push(`${label} is required.`);
    }
  }

  if (step === 1) {
    if (!isBlank(data.email) && !isValidEmail(data.email)) {
      errors.push("Please enter a valid email address.");
    }

    if (!isBlank(data.date_of_birth) && !isPlausibleBirthDate(data.date_of_birth)) {
      errors.push("Please enter a valid date of birth.");
    }
  }

  if (step === 2) {
    if (
      !isBlank(data.education) &&
      !EDUCATION_OPTIONS.includes(data.education as EducationOption)
    ) {
      errors.push("Please choose one of the listed education options.");
    }

    // Mirrors the `education_other_required` constraint on the table.
    if (data.education === "Other" && isBlank(data.education_other)) {
      errors.push("Please specify your education.");
    }
  }

  return errors;
}

/** Every problem across every step — what the submit route checks. */
export function validateRegistration(data: RegistrationFormData): string[] {
  const errors: string[] = [];

  for (let step = 1; step <= TOTAL_STEPS; step++) {
    errors.push(...validateStep(step, data));
  }

  return errors;
}

export function isValidEmail(value: string): boolean {
  // Deliberately loose: enough to catch a typo, not enough to reject a valid
  // address that happens to look unusual.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function isPlausibleBirthDate(value: string): boolean {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const year = date.getUTCFullYear();

  return year >= 1900 && date.getTime() < Date.now();
}

/* ------------------------------------------------------------------
   Normalisation

   Applied once, on the server, immediately before the insert — so what
   lands in the database is trimmed and consistently cased no matter how
   it was typed.
------------------------------------------------------------------ */

export interface NormalisedRegistration {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  date_of_birth: string;
  email: string;
  phone_number: string;
  state_of_origin: string;
  current_state: string;
  current_city: string;
  role: string;
  education: string;
  education_other: string | null;
  bank_name: string;
  account_number: string;
  account_name: string;
}

export function normaliseRegistration(
  data: RegistrationFormData,
): NormalisedRegistration {
  const trimmed = (value: string) => value.trim();

  return {
    first_name: trimmed(data.first_name),
    middle_name: trimmed(data.middle_name) || null,
    last_name: trimmed(data.last_name),
    date_of_birth: trimmed(data.date_of_birth),
    email: trimmed(data.email).toLowerCase(),
    phone_number: trimmed(data.phone_number),
    state_of_origin: trimmed(data.state_of_origin),
    current_state: trimmed(data.current_state),
    current_city: trimmed(data.current_city),
    role: trimmed(data.role),
    education: trimmed(data.education),
    education_other:
      data.education === "Other" ? trimmed(data.education_other) || null : null,
    bank_name: trimmed(data.bank_name),
    account_number: trimmed(data.account_number),
    account_name: trimmed(data.account_name),
  };
}

/* ------------------------------------------------------------------
   Uploads
------------------------------------------------------------------ */

export interface DecodedUpload {
  bytes: Uint8Array;
  contentType: string;
  /** Extension including the dot, derived from the MIME type. */
  extension: string;
}

/**
 * Turns a `data:` URL back into bytes, rejecting anything that isn't one of the
 * four accepted types or that exceeds the bucket's file size limit.
 *
 * Throws with a message intended for display — the submit route passes it
 * straight back to the browser.
 */
export function decodeUpload(upload: UploadData, label: string): DecodedUpload {
  // `[\s\S]` rather than `.` with the `s` flag: the project targets ES2017,
  // where that flag is not available.
  const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(upload.data);

  if (!match) {
    throw new Error(`${label} could not be read. Please upload it again.`);
  }

  const contentType = match[1].toLowerCase();

  if (!ALLOWED_UPLOAD_TYPES.includes(contentType as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
    throw new Error(`${label} must be a JPG, PNG, WEBP or PDF file.`);
  }

  let bytes: Uint8Array;

  try {
    bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
  } catch {
    throw new Error(`${label} could not be read. Please upload it again.`);
  }

  if (bytes.byteLength === 0) {
    throw new Error(`${label} appears to be empty. Please upload it again.`);
  }

  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(
      `${label} is larger than ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB. Please upload a smaller file.`,
    );
  }

  return { bytes, contentType, extension: extensionFor(contentType) };
}

export function extensionFor(contentType: string): string {
  switch (contentType.toLowerCase()) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "application/pdf":
      return ".pdf";
    default:
      return "";
  }
}
