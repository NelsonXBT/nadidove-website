"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import AgreementDocument from "@/components/staff/AgreementDocument";
import PortalHeader from "@/components/staff/PortalHeader";
import {
  AGREEMENT_DOCUMENT_HEADING,
  AGREEMENT_TITLE,
  AGREEMENT_VERSION,
  type AgreementRecord,
} from "@/lib/staff/agreement";
import { readDraft, useIsHydrated } from "@/lib/staff/draft";
import {
  AGREEMENT_ACCEPTED_AT_KEY,
  AGREEMENT_ACCEPTED_KEY,
  AGREEMENT_VERSION_KEY,
  EDUCATION_OPTIONS,
  type RegistrationFormData,
  STEP_TITLES,
  STORAGE_KEY,
  TOTAL_STEPS,
  type UploadData,
  validateStep,
} from "@/lib/staff/registration";

/*
 * ------------------------------------------------------------
 * IMAGE COMPRESSION SETTINGS
 * ------------------------------------------------------------
 *
 * Uploads are held as data URLs in sessionStorage until submission, so an
 * untouched phone photo would blow the storage quota. Images are resized and
 * re-encoded as JPEG before being stored, which keeps the draft inside quota
 * and gives the PDF generator a format it can embed.
 */

const MAX_IMAGE_WIDTH = 1600;
const MAX_IMAGE_HEIGHT = 1600;
const TARGET_IMAGE_SIZE = 900 * 1024; // approximately 900KB

/*
 * PDFs are passed through untouched — re-rasterising an ID document would lose
 * the detail that makes it checkable — so they are capped instead.
 */
const MAX_PDF_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * The registration flow: welcome, the agreement, and the four form sections.
 *
 * `isEditMode` comes from the `?edit=true` the review screen navigates with. It
 * is resolved on the server and passed in, rather than read here with
 * `useSearchParams`, which would put this whole flow behind a Suspense
 * boundary for one boolean.
 *
 * The flow opens on whatever draft the browser is holding, and that draft can
 * only be read once hydration has finished — so this waits for it, then mounts
 * the flow with the draft already in hand. Seeding the form that way, rather
 * than filling it in afterwards, means the applicant never watches their own
 * answers appear.
 */
export default function RegistrationFlow({
  isEditMode,
}: {
  isEditMode: boolean;
}) {
  const hydrated = useIsHydrated();

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
          <PortalHeader />

          <p className="mt-20 text-neutral-500">Loading your registration…</p>
        </div>
      </main>
    );
  }

  return <RegistrationSteps isEditMode={isEditMode} />;
}

/**
 * Welcome, the agreement and the form are states of one component because they
 * share the draft and the acceptance — moving between them is a state change,
 * not a navigation, so a half-filled form is never at the mercy of the back
 * button.
 *
 * Edit mode arrives from the review screen with the agreement already accepted,
 * so it opens straight onto the form.
 */
function RegistrationSteps({ isEditMode }: { isEditMode: boolean }) {
  const router = useRouter();

  /*
   * started:            the welcome screen has been passed.
   * agreementAccepted:  the agreement has been accepted.
   */
  const [started, setStarted] = useState(isEditMode);
  const [agreementAccepted, setAgreementAccepted] = useState(isEditMode);

  /*
   * Ticking the box does not accept the agreement — it only enables the
   * "I Accept Agreement" button. Acceptance is the click.
   */
  const [agreementChecked, setAgreementChecked] = useState(false);

  const [agreement, setAgreement] = useState<AgreementRecord | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [agreementError, setAgreementError] = useState("");

  const [step, setStep] = useState(1);

  /*
   * The draft the review screen saved, so "Edit" reopens the answers rather
   * than a blank form. A fresh visit finds nothing stored and starts empty.
   */
  const [formData, setFormData] = useState<RegistrationFormData>(readDraft);
  const [errors, setErrors] = useState<string[]>([]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ------------------------------------------------------------
     Start

     Fetches the agreement row so the acceptance can be recorded
     against a real version. The wording itself is rendered from
     `lib/staff/agreement.ts`, which is the same source the row was
     seeded from — so if the request fails, the applicant still reads
     the genuine agreement and only the version label falls back.
  ------------------------------------------------------------ */

  async function startRegistration() {
    setErrors([]);
    setAgreementError("");
    setAgreementLoading(true);

    try {
      const response = await fetch("/api/agreements/active", {
        cache: "no-store",
      });

      const result = await response.json().catch(() => null);

      if (response.ok && result?.success && result?.data) {
        setAgreement(result.data as AgreementRecord);
      } else {
        setAgreement(fallbackAgreement());

        if (result?.error) {
          setAgreementError(
            `${result.error} Your acceptance will still be recorded when you submit.`,
          );
        }
      }
    } catch {
      setAgreement(fallbackAgreement());
    } finally {
      setAgreementLoading(false);
    }

    setStarted(true);
    setAgreementAccepted(false);
    setAgreementChecked(false);

    scrollToTop();
  }

  /* ------------------------------------------------------------
     Accept
  ------------------------------------------------------------ */

  function acceptAgreement() {
    setErrors([]);
    setAgreementError("");

    if (!agreementChecked) {
      setAgreementError(
        "Please tick the box to confirm you have read and accept the agreement.",
      );

      return;
    }

    /*
     * The acceptance timestamp is the moment of this click. It is carried
     * through to submission, where it is written to the acceptance record and
     * printed on the completed PDF.
     */
    try {
      sessionStorage.setItem(AGREEMENT_ACCEPTED_KEY, "true");
      sessionStorage.setItem(
        AGREEMENT_VERSION_KEY,
        agreement?.version ?? AGREEMENT_VERSION,
      );
      sessionStorage.setItem(AGREEMENT_ACCEPTED_AT_KEY, new Date().toISOString());
    } catch {
      setAgreementError(
        "Unable to save your agreement acceptance. Please try again.",
      );

      return;
    }

    setAgreementAccepted(true);
    setStep(1);

    scrollToTop();
  }

  /* ------------------------------------------------------------
     Fields
  ------------------------------------------------------------ */

  function updateField(field: keyof RegistrationFormData, value: string) {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors([]);
  }

  /* ------------------------------------------------------------
     Uploads
  ------------------------------------------------------------ */

  /** Resizes and re-encodes an image as JPEG, small enough to hold in a draft. */
  async function compressImage(file: File): Promise<UploadData> {
    const bitmap = await createImageBitmap(file);

    let width = bitmap.width;
    let height = bitmap.height;

    if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
      const ratio = Math.min(
        MAX_IMAGE_WIDTH / width,
        MAX_IMAGE_HEIGHT / height,
      );

      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      bitmap.close();

      throw new Error("Unable to process the uploaded image.");
    }

    // Without this, a transparent PNG turns black on the way to JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    bitmap.close();

    let quality = 0.82;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);

    // Base64 carries about a 37% overhead, hence the 1.37 factor.
    while (dataUrl.length > TARGET_IMAGE_SIZE * 1.37 && quality > 0.45) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    if (dataUrl.length > TARGET_IMAGE_SIZE * 1.37) {
      // Still too large at the quality floor, so give up some resolution.
      const scale = 0.75;

      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));

      const resized = canvas.getContext("2d");

      if (!resized) {
        throw new Error("Unable to process the uploaded image.");
      }

      resized.fillStyle = "#ffffff";
      resized.fillRect(0, 0, canvas.width, canvas.height);

      const secondBitmap = await createImageBitmap(file);

      resized.drawImage(secondBitmap, 0, 0, canvas.width, canvas.height);
      secondBitmap.close();

      dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    }

    return {
      name: `${file.name.replace(/\.[^/.]+$/, "")}.jpg`,
      type: "image/jpeg",
      data: dataUrl,
    };
  }

  function readPdf(file: File): Promise<UploadData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("Unable to read the uploaded PDF."));

          return;
        }

        resolve({ name: file.name, type: file.type, data: reader.result });
      };

      reader.onerror = () => reject(new Error("Unable to read the uploaded PDF."));

      reader.readAsDataURL(file);
    });
  }

  async function handleFileUpload(
    field: "passport" | "government_id" | "signature",
    file: File | null,
  ) {
    if (!file) {
      return;
    }

    setErrors([]);

    const images = ["image/jpeg", "image/png", "image/webp"];

    if (![...images, "application/pdf"].includes(file.type)) {
      setErrors(["Please upload a JPG, PNG, WEBP image or PDF file."]);

      return;
    }

    if (field !== "government_id" && file.type === "application/pdf") {
      setErrors([
        `${
          field === "passport" ? "Your passport photograph" : "Your signature"
        } must be an image file.`,
      ]);

      return;
    }

    if (file.type === "application/pdf" && file.size > MAX_PDF_SIZE) {
      setErrors(["PDF files must be 2MB or smaller."]);

      return;
    }

    try {
      const upload = images.includes(file.type)
        ? await compressImage(file)
        : await readPdf(file);

      setFormData((current) => ({ ...current, [field]: upload }));
    } catch {
      setErrors(["Unable to process this file. Please try another file."]);
    }
  }

  /* ------------------------------------------------------------
     Steps
  ------------------------------------------------------------ */

  function nextStep() {
    const problems = validateStep(step, formData);

    if (problems.length > 0) {
      setErrors(problems);
      scrollToTop();

      return;
    }

    setErrors([]);

    if (step < TOTAL_STEPS) {
      setStep((current) => current + 1);
      scrollToTop();
    }
  }

  function previousStep() {
    setErrors([]);

    if (step > 1) {
      setStep((current) => current - 1);
      scrollToTop();
    }
  }

  /** Validates the last step, saves the draft, and opens the review screen. */
  function reviewRegistration() {
    const problems = validateStep(TOTAL_STEPS, formData);

    if (problems.length > 0) {
      setErrors(problems);
      scrollToTop();

      return;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    } catch {
      setErrors([
        "The uploaded files are too large for temporary browser storage. Please use smaller images or a smaller PDF.",
      ]);

      return;
    }

    setErrors([]);
    router.push("/staff/registration/preview");
  }

  /* ============================================================
     WELCOME
  ============================================================ */

  if (!started) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
          <PortalHeader />

          <section className="max-w-5xl pt-16 md:pt-24">
            <p className="mb-5 text-xs uppercase tracking-[0.35em] text-neutral-500">
              Welcome
            </p>

            <h1 className="max-w-5xl text-5xl font-medium leading-[0.95] tracking-tight md:text-7xl lg:text-[88px]">
              Welcome to the
              <br />
              Nadidove Staff
              <br />
              Registration Portal.
            </h1>

            <p className="mt-8 max-w-3xl text-lg leading-8 text-neutral-400">
              Please click Start to begin your registration. You will first
              review and accept the {AGREEMENT_TITLE.replace("Nadidove Films — ", "")},
              then complete your registration details.
            </p>

            {agreementError && <Notice>{agreementError}</Notice>}

            <button
              type="button"
              onClick={startRegistration}
              disabled={agreementLoading}
              className="mt-12 bg-[#D7192F] px-9 py-5 text-sm uppercase tracking-[0.18em] text-white transition hover:bg-[#bd1529] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {agreementLoading ? "Loading agreement…" : "Start"}
              {!agreementLoading && <span className="ml-6">→</span>}
            </button>

            <p className="mt-4 max-w-xl text-xs leading-6 text-neutral-600">
              Please have your personal, professional, payment and
              identification details available before beginning. You will need a
              passport photograph, a government-issued ID and an image of your
              signature.
            </p>
          </section>
        </div>
      </main>
    );
  }

  /* ============================================================
     AGREEMENT
  ============================================================ */

  if (!agreementAccepted) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
          <PortalHeader />

          <div className="mt-16">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-neutral-500">
              Step 1 of 2 · The agreement
            </p>

            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
              {agreement?.title ?? AGREEMENT_TITLE}
            </h1>

            <p className="mt-6 text-lg leading-8 text-neutral-400">
              Take your time to read this staff agreement thoroughly, then
              accept it to proceed with the next step.
            </p>

            <p className="mt-3 text-xs uppercase tracking-[0.15em] text-neutral-600">
              Version {agreement?.version ?? AGREEMENT_VERSION}
            </p>
          </div>

          {agreementError && <Notice>{agreementError}</Notice>}

          {/*
            The agreement flows down the page rather than sitting in its own
            scroll box, so it reads as one continuous document and the
            acceptance controls sit at the end of it.
          */}
          <article className="mt-14 border-t border-neutral-800 pt-14">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              {AGREEMENT_DOCUMENT_HEADING}
            </h2>

            <div className="mt-10">
              <AgreementDocument />
            </div>
          </article>

          <div className="mt-16 border-t border-neutral-800 pt-10">
            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={agreementChecked}
                onChange={(event) => {
                  setAgreementChecked(event.target.checked);
                  setAgreementError("");
                }}
                className="mt-1 h-5 w-5 shrink-0 accent-[#D7192F]"
              />

              <span className="text-sm leading-7 text-neutral-300">
                I have read and understood the{" "}
                {agreement?.title ?? AGREEMENT_TITLE} in full, and I agree to be
                bound by its terms.
              </span>
            </label>

            <button
              type="button"
              onClick={acceptAgreement}
              disabled={!agreementChecked}
              className={`mt-10 px-8 py-4 text-sm uppercase tracking-[0.15em] transition ${
                agreementChecked
                  ? "bg-[#D7192F] text-white hover:bg-[#bd1529]"
                  : "cursor-not-allowed bg-neutral-900 text-neutral-600"
              }`}
            >
              I Accept Agreement →
            </button>

            {!agreementChecked && (
              <p className="mt-4 text-xs text-neutral-600">
                Tick the box above to enable this button.
              </p>
            )}

            <div className="mt-10">
              <button
                type="button"
                onClick={() => {
                  setStarted(false);
                  setAgreementChecked(false);
                  setAgreementError("");
                  setErrors([]);
                  scrollToTop();
                }}
                className="text-xs uppercase tracking-[0.15em] text-neutral-600 transition hover:text-white"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ============================================================
     REGISTRATION FORM
  ============================================================ */

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
        <PortalHeader />

        <div className="mt-16">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-neutral-500">
            {isEditMode ? "Editing your registration" : "Step 2 of 2 · Your details"}
          </p>

          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            Your registration
          </h1>

          <p className="mt-6 max-w-2xl leading-8 text-neutral-400">
            Complete each section, then review everything before you submit.
          </p>
        </div>

        {/* STEP INDICATOR */}
        <div className="mt-14">
          <div className="flex items-end justify-between border-b border-neutral-800 pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Section
              </p>

              <p className="mt-1 text-lg">
                {step} of {TOTAL_STEPS}
              </p>
            </div>

            <p className="text-sm text-neutral-400">{STEP_TITLES[step]}</p>
          </div>

          <div className="h-[2px] w-full bg-neutral-900">
            <div
              className="h-full bg-[#D7192F] transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {errors.length > 0 && (
          <Notice>
            {errors.length === 1 ? (
              errors[0]
            ) : (
              <ul className="space-y-1">
                {errors.map((message) => (
                  <li key={message}>• {message}</li>
                ))}
              </ul>
            )}
          </Notice>
        )}

        <div className="mt-12">
          {/* SECTION 1 — PERSONAL */}
          {step === 1 && (
            <section>
              <SectionHeading
                title="Personal Information"
                description="Tell us about yourself. Your name will appear on your agreement exactly as entered here."
              />

              <div className="mt-10 space-y-7">
                <Field
                  label="First Name"
                  value={formData.first_name}
                  onChange={(value) => updateField("first_name", value)}
                  autoComplete="given-name"
                />

                <Field
                  label="Middle Name"
                  value={formData.middle_name}
                  onChange={(value) => updateField("middle_name", value)}
                  autoComplete="additional-name"
                  required={false}
                />

                <Field
                  label="Last Name / Surname"
                  value={formData.last_name}
                  onChange={(value) => updateField("last_name", value)}
                  autoComplete="family-name"
                />

                <Field
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(value) => updateField("date_of_birth", value)}
                  autoComplete="bday"
                />

                <Field
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(value) => updateField("email", value)}
                  autoComplete="email"
                />

                <Field
                  label="Phone Number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(value) => updateField("phone_number", value)}
                  autoComplete="tel"
                />

                <FileUpload
                  label="Passport Photograph"
                  description="A clear, recent photograph of your face. JPG, PNG or WEBP."
                  value={formData.passport}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(file) => handleFileUpload("passport", file)}
                />
              </div>
            </section>
          )}

          {/* SECTION 2 — PROFESSIONAL */}
          {step === 2 && (
            <section>
              <SectionHeading
                title="Professional Information"
                description="Tell us where you are based, your role at Nadidove, and your educational background."
              />

              <div className="mt-10 space-y-7">
                <Field
                  label="State of Origin"
                  value={formData.state_of_origin}
                  onChange={(value) => updateField("state_of_origin", value)}
                />

                <Field
                  label="Current State"
                  value={formData.current_state}
                  onChange={(value) => updateField("current_state", value)}
                  autoComplete="address-level1"
                />

                <Field
                  label="Current City"
                  value={formData.current_city}
                  onChange={(value) => updateField("current_city", value)}
                  autoComplete="address-level2"
                />

                <Field
                  label="Role at Nadidove"
                  value={formData.role}
                  onChange={(value) => updateField("role", value)}
                  placeholder="For example: Director of Photography"
                />

                {/*
                  A fixed list, not free text: the `education` column carries a
                  CHECK constraint naming exactly these four values, so anything
                  else would be rejected on submission.
                */}
                <Select
                  label="Education"
                  value={formData.education}
                  onChange={(value) => updateField("education", value)}
                  options={EDUCATION_OPTIONS}
                  placeholder="Select your education"
                />

                {formData.education === "Other" && (
                  <Field
                    label="Please specify your education"
                    value={formData.education_other}
                    onChange={(value) => updateField("education_other", value)}
                  />
                )}
              </div>
            </section>
          )}

          {/* SECTION 3 — PAYMENT */}
          {step === 3 && (
            <section>
              <SectionHeading
                title="Payment Information"
                description="The account your Nadidove payments will be sent to. These details are stored privately and are never shown publicly."
              />

              <div className="mt-10 space-y-7">
                <Field
                  label="Bank Name"
                  value={formData.bank_name}
                  onChange={(value) => updateField("bank_name", value)}
                />

                <Field
                  label="Account Number"
                  value={formData.account_number}
                  onChange={(value) => updateField("account_number", value)}
                  inputMode="numeric"
                />

                <Field
                  label="Account Name"
                  value={formData.account_name}
                  onChange={(value) => updateField("account_name", value)}
                />
              </div>
            </section>
          )}

          {/* SECTION 4 — DOCUMENTS */}
          {step === 4 && (
            <section>
              <SectionHeading
                title="Required Documents"
                description="Your identification and signature. Your signature is placed on your completed agreement."
              />

              <div className="mt-10 space-y-12">
                <FileUpload
                  label="Government ID"
                  description="A valid government-issued ID — NIN slip, driver's licence, voter's card or international passport. JPG, PNG, WEBP or PDF."
                  value={formData.government_id}
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(file) => handleFileUpload("government_id", file)}
                />

                <FileUpload
                  label="Signature"
                  description="A clear image of your handwritten signature on plain paper. JPG, PNG or WEBP."
                  value={formData.signature}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(file) => handleFileUpload("signature", file)}
                />
              </div>
            </section>
          )}

          {/* NAVIGATION */}
          <div className="mt-16 flex items-center justify-between gap-4 border-t border-neutral-800 pt-8">
            <button
              type="button"
              onClick={previousStep}
              disabled={step === 1}
              className="border border-neutral-800 px-7 py-4 text-sm uppercase tracking-[0.15em] text-neutral-400 transition hover:border-neutral-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Back
            </button>

            <button
              type="button"
              onClick={step < TOTAL_STEPS ? nextStep : reviewRegistration}
              className="bg-[#D7192F] px-8 py-4 text-sm uppercase tracking-[0.15em] text-white transition hover:bg-[#bd1529]"
            >
              {step < TOTAL_STEPS ? "Next →" : "Submit →"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Stand-in used when `/api/agreements/active` cannot be reached. The wording is
 * the real agreement either way — it is rendered from `lib/staff/agreement.ts`,
 * not from this record — so only the row id is unknown, and the submit route
 * resolves the real one server-side.
 */
function fallbackAgreement(): AgreementRecord {
  return {
    id: "",
    title: AGREEMENT_TITLE,
    version: AGREEMENT_VERSION,
    content: "",
    is_active: true,
  };
}

/* ------------------------------------------------------------
   Pieces
------------------------------------------------------------ */

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-8 border border-red-900 bg-red-950/30 px-5 py-4 text-sm leading-6 text-red-300"
    >
      {children}
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-medium">{title}</h2>

      <p className="mt-3 max-w-xl leading-7 text-neutral-500">{description}</p>
    </div>
  );
}

function Label({
  label,
  required,
  htmlFor,
}: {
  label: string;
  required: boolean;
  htmlFor: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-3 block text-sm text-neutral-400">
      {label}
      {required && <span className="ml-1 text-[#D7192F]">*</span>}
    </label>
  );
}

/** Turns a label into a stable id, so the label and its control stay linked. */
function fieldId(label: string): string {
  return `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = true,
  placeholder,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "tel" | "text";
}) {
  const id = fieldId(label);

  return (
    <div>
      <Label label={label} required={required} htmlFor={id} />

      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-neutral-800 bg-transparent px-5 py-4 text-white outline-none transition placeholder:text-neutral-700 focus:border-[#D7192F] [color-scheme:dark]"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
}) {
  const id = fieldId(label);

  return (
    <div>
      <Label label={label} required htmlFor={id} />

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none border border-neutral-800 bg-transparent px-5 py-4 text-white outline-none transition focus:border-[#D7192F]"
      >
        <option value="" disabled className="bg-neutral-950">
          {placeholder}
        </option>

        {options.map((option) => (
          <option key={option} value={option} className="bg-neutral-950">
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function FileUpload({
  label,
  description,
  value,
  accept,
  onChange,
}: {
  label: string;
  description: string;
  value: UploadData | null;
  accept: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <p className="mb-3 block text-sm text-neutral-400">
        {label}
        <span className="ml-1 text-[#D7192F]">*</span>
      </p>

      <p className="mb-4 max-w-xl text-sm leading-6 text-neutral-600">
        {description}
      </p>

      <label className="block cursor-pointer border border-dashed border-neutral-700 px-6 py-8 transition hover:border-neutral-500">
        <input
          type="file"
          accept={accept}
          onChange={(event) => {
            onChange(event.target.files?.[0] ?? null);

            // Lets the same file be picked again after a replacement.
            event.target.value = "";
          }}
          className="hidden"
        />

        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="truncate text-sm text-neutral-300">
              {value ? value.name : "Choose a file"}
            </p>

            <p className="mt-2 text-xs uppercase tracking-[0.15em] text-neutral-600">
              {value ? "File selected — click to replace" : "Click to upload"}
            </p>
          </div>

          <span className="shrink-0 border border-neutral-800 px-5 py-3 text-xs uppercase tracking-[0.15em] text-neutral-400">
            Browse
          </span>
        </div>
      </label>

      {value && (
        <div className="mt-5">
          {value.type.startsWith("image/") ? (
            /* eslint-disable-next-line @next/next/no-img-element -- a data URL from
               the browser, with no origin for the image optimiser to fetch. */
            <img
              src={value.data}
              alt={label}
              className="max-h-48 max-w-xs border border-neutral-800 object-contain"
            />
          ) : (
            <p className="text-xs uppercase tracking-[0.15em] text-neutral-500">
              PDF attached
            </p>
          )}
        </div>
      )}
    </div>
  );
}
