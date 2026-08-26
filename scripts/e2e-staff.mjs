/*
 * End-to-end check of the staff registration flow against the live database.
 *
 * Walks the same sequence the browser does — agreement, submit, read back,
 * records list, PDF — and reports what each step actually returned.
 *
 *   node scripts/e2e-staff.mjs [--pdf-id]
 *
 * `--pdf-id` files the government ID as a PDF instead of an image, which is the
 * other branch of the PDF builder.
 */

import { readFile } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSCODE = process.env.STAFF_PORTAL_PASSCODE;

const usePdfId = process.argv.includes("--pdf-id");

let failures = 0;
let cookie = "";

function report(ok, label, detail = "") {
  if (!ok) {
    failures++;
  }

  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function dataUrl(path, type) {
  const bytes = await readFile(path);

  return `data:${type};base64,${bytes.toString("base64")}`;
}

/** Sends a request, carrying whatever cookie the records session handed back. */
async function call(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...init.headers,
    },
  });

  const setCookie = response.headers.get("set-cookie");

  if (setCookie) {
    cookie = setCookie.split(";")[0];
  }

  const contentType = response.headers.get("content-type") ?? "";

  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : Buffer.from(await response.arrayBuffer());

  return { status: response.status, body, contentType };
}

/* ------------------------------------------------------------------
   1. The active agreement
------------------------------------------------------------------ */

const agreement = await call("/api/agreements/active");

report(
  agreement.status === 200 && agreement.body?.success === true,
  "GET /api/agreements/active",
  `${agreement.status} version=${agreement.body?.data?.version ?? "?"}`,
);

/* ------------------------------------------------------------------
   2. Submit a registration
------------------------------------------------------------------ */

const stamp = Date.now();

const registration = {
  first_name: "Amaka",
  middle_name: "Chidera",
  last_name: `Okonkwo-${stamp}`,
  date_of_birth: "1996-04-12",
  email: `e2e.${stamp}@nadidove.test`,
  phone_number: "+234 802 555 0143",

  passport: {
    name: "passport.jpg",
    type: "image/jpeg",
    data: await dataUrl("/tmp/nadidove-test/passport.jpg", "image/jpeg"),
  },

  state_of_origin: "Anambra",
  current_state: "Lagos",
  current_city: "Yaba",

  role: "Director of Photography",
  education: "Graduate",
  education_other: "",

  bank_name: "Guaranty Trust Bank",
  account_number: "0123456789",
  account_name: "Amaka Chidera Okonkwo",

  government_id: usePdfId
    ? {
        name: "id.pdf",
        type: "application/pdf",
        data: await dataUrl("/tmp/nadidove-test/id.pdf", "application/pdf"),
      }
    : {
        name: "id.png",
        type: "image/png",
        data: await dataUrl("/tmp/nadidove-test/id.png", "image/png"),
      },

  signature: {
    name: "signature.jpg",
    type: "image/jpeg",
    data: await dataUrl("/tmp/nadidove-test/signature.jpg", "image/jpeg"),
  },
};

const acceptedAt = new Date(Date.now() - 60_000).toISOString();

const submit = await call("/api/staff/register", {
  method: "POST",
  body: JSON.stringify({ registration, agreement_accepted_at: acceptedAt }),
});

const created = submit.body?.data;

report(
  submit.status === 201 && submit.body?.success === true,
  "POST /api/staff/register",
  submit.status === 201
    ? `id=${created?.id} status=${created?.submission_status}`
    : `${submit.status} ${JSON.stringify(submit.body)}`,
);

if (!created?.id) {
  console.log("\nCannot continue without a created record.");
  process.exit(1);
}

report(
  created.submission_status === "completed",
  "record reaches completed",
  `status=${created.submission_status}`,
);

report(
  created.accepted_at?.startsWith(acceptedAt.slice(0, 16)) ?? false,
  "acceptance keeps the browser's timestamp",
  `sent=${acceptedAt} stored=${created.accepted_at}`,
);

/* ------------------------------------------------------------------
   3. Validation is enforced server-side
------------------------------------------------------------------ */

const bad = await call("/api/staff/register", {
  method: "POST",
  body: JSON.stringify({
    registration: { ...registration, email: "not-an-email", bank_name: "" },
  }),
});

report(
  bad.status === 400 && Array.isArray(bad.body?.errors) && bad.body.errors.length >= 2,
  "invalid submission is rejected",
  `${bad.status} ${JSON.stringify(bad.body?.errors ?? bad.body?.error)}`,
);

/* ------------------------------------------------------------------
   4. This browser can reach its own submission
------------------------------------------------------------------ */

const own = await call(`/api/staff/${created.id}`);

report(
  own.status === 200 && own.body?.data?.id === created.id,
  "GET /api/staff/[id] with the submission cookie",
  `${own.status}`,
);

const ownPdf = await call(`/api/staff/${created.id}/pdf`);

const isPdf =
  Buffer.isBuffer(ownPdf.body) && ownPdf.body.subarray(0, 5).toString() === "%PDF-";

report(
  ownPdf.status === 200 && isPdf,
  "GET /api/staff/[id]/pdf returns a PDF",
  `${ownPdf.status} ${ownPdf.contentType} ${Buffer.isBuffer(ownPdf.body) ? `${ownPdf.body.length} bytes` : ""}`,
);

if (isPdf) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile("/tmp/nadidove-test/completed.pdf", ownPdf.body);
  console.log("      saved /tmp/nadidove-test/completed.pdf");
}

/* ------------------------------------------------------------------
   5. The records area is locked without the passcode
------------------------------------------------------------------ */

const savedCookie = cookie;
cookie = "";

const locked = await call("/api/staff/records");

report(
  locked.status === 401,
  "GET /api/staff/records is locked without a passcode",
  `${locked.status}`,
);

const wrong = await call("/api/staff/records/session", {
  method: "POST",
  body: JSON.stringify({ passcode: "definitely-not-it" }),
});

report(wrong.status !== 200, "wrong passcode is refused", `${wrong.status}`);

/* ------------------------------------------------------------------
   6. Unlocking, then reading the list and one record
------------------------------------------------------------------ */

if (!PASSCODE) {
  report(false, "STAFF_PORTAL_PASSCODE not available to this script");
} else {
  cookie = "";

  const unlock = await call("/api/staff/records/session", {
    method: "POST",
    body: JSON.stringify({ passcode: PASSCODE }),
  });

  report(unlock.status === 200, "correct passcode unlocks", `${unlock.status}`);

  const list = await call("/api/staff/records");

  const rows = Array.isArray(list.body?.data) ? list.body.data : [];
  const mine = rows.find((row) => row.id === created.id);

  report(
    list.status === 200 && Boolean(mine),
    "GET /api/staff/records lists the new registration",
    `${list.status} ${rows.length} row(s)`,
  );

  report(
    mine ? !("account_number" in mine) && !("bank_name" in mine) : false,
    "list carries no banking details",
    mine ? Object.keys(mine).join(",") : "row not found",
  );

  const detail = await call(`/api/staff/${created.id}`);
  const record = detail.body?.data;

  report(
    detail.status === 200 && record?.account_number === registration.account_number,
    "GET /api/staff/[id] returns the full record",
    `${detail.status}`,
  );

  report(
    Boolean(record?.documents?.passport && record?.documents?.government_id && record?.documents?.signature),
    "all three documents come back as signed URLs",
    record?.documents ? Object.keys(record.documents).filter((k) => record.documents[k]).join(",") : "none",
  );

  report(
    record?.acceptance?.agreement_version === agreement.body?.data?.version,
    "acceptance is recorded against the active agreement",
    `${record?.acceptance?.agreement_version} vs ${agreement.body?.data?.version}`,
  );

  report(
    record?.education === "Graduate" && record?.education_other === null,
    "education is stored as chosen",
    `${record?.education} / ${record?.education_other}`,
  );

  // The signed document URLs should actually fetch.
  if (record?.documents?.passport) {
    const file = await fetch(record.documents.passport);

    report(
      file.ok,
      "a signed document URL fetches",
      `${file.status} ${file.headers.get("content-type")}`,
    );
  }
}

cookie = savedCookie;

console.log(
  `\n${failures === 0 ? "All checks passed" : `${failures} check(s) failed`} · record ${created.id}`,
);

process.exit(failures === 0 ? 0 : 1);
