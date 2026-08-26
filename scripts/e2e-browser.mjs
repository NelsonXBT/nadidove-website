/*
 * Drives the staff registration flow in a real browser, over the Chrome
 * DevTools Protocol, with no test dependencies.
 *
 *   node scripts/e2e-browser.mjs
 *
 * `scripts/e2e-staff.mjs` calls the API directly, which leaves the whole
 * browser half of the flow unexercised: hydration, the draft in sessionStorage,
 * the canvas image compression, the step validation, the review round-trip and
 * the completion screen. This walks that path the way an applicant does —
 * clicking the real buttons and handing real files to the real file inputs —
 * and fails on any console error or uncaught exception along the way.
 */

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PORT = 9333;
const FIXTURES = "/tmp/nadidove-test";

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

let failures = 0;

function report(ok, label, detail = "") {
  if (!ok) {
    failures++;
  }

  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

/* ------------------------------------------------------------------
   A minimal CDP client
------------------------------------------------------------------ */

class Session {
  #socket;
  #nextId = 1;
  #pending = new Map();

  /** Console errors and uncaught exceptions, collected for the final check. */
  problems = [];

  constructor(socket) {
    this.#socket = socket;

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.id && this.#pending.has(message.id)) {
        const { resolve, reject } = this.#pending.get(message.id);

        this.#pending.delete(message.id);

        message.error ? reject(new Error(message.error.message)) : resolve(message.result);

        return;
      }

      if (message.method === "Runtime.exceptionThrown") {
        const text =
          message.params.exceptionDetails?.exception?.description ??
          message.params.exceptionDetails?.text ??
          "uncaught exception";

        this.problems.push(`exception: ${text.split("\n")[0]}`);
      }

      if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
        const text = message.params.args
          .map((arg) => arg.value ?? arg.description ?? "")
          .join(" ")
          .trim();

        // React logs hydration mismatches and key warnings here.
        this.problems.push(`console.error: ${text.slice(0, 220)}`);
      }
    });
  }

  static async open(url) {
    const socket = new WebSocket(url);

    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error("CDP socket failed")), {
        once: true,
      });
    });

    return new Session(socket);
  }

  send(method, params = {}) {
    const id = this.#nextId++;

    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#socket.send(JSON.stringify({ id, method, params }));
    });
  }

  /** Evaluates an expression in the page and returns its value. */
  async eval(expression) {
    const result = await this.send("Runtime.evaluate", {
      // Async, so an assertion can await a fetch of its own.
      expression: `(async () => { ${expression} })()`,
      returnByValue: true,
      awaitPromise: true,
    });

    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text ??
          "evaluate failed",
      );
    }

    return result.result.value;
  }

  /** Polls an expression until it returns true. */
  async waitFor(expression, label, timeout = 15000) {
    const deadline = Date.now() + timeout;

    for (;;) {
      if (await this.eval(`return Boolean(${expression});`)) {
        return true;
      }

      if (Date.now() > deadline) {
        throw new Error(`timed out waiting for ${label}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  async navigate(path) {
    await this.send("Page.navigate", { url: `${BASE}${path}` });
    await this.eval("return true;");
  }

  close() {
    this.#socket.close();
  }
}

/* ------------------------------------------------------------------
   Page helpers, injected as expressions
------------------------------------------------------------------ */

/*
 * React tracks the value it last wrote to an input, so assigning `.value`
 * directly is ignored as a no-op. Going through the prototype's setter and then
 * dispatching the event is what makes a controlled input actually update.
 */
const SET_VALUE = `
  const set = (el, value) => {
    const proto = el instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;

    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
`;

function fill(fields) {
  const entries = JSON.stringify(fields);

  return `
    ${SET_VALUE}

    const missing = [];

    for (const [id, value] of Object.entries(${entries})) {
      const el = document.getElementById(id);

      if (!el) {
        missing.push(id);
        continue;
      }

      set(el, value);
    }

    return missing;
  `;
}

/** Clicks the first button or link whose trimmed text starts with `text`. */
function clickText(text) {
  return `
    const target = [...document.querySelectorAll("button, a")].find(
      (el) => el.textContent.trim().toLowerCase().startsWith(${JSON.stringify(text.toLowerCase())}),
    );

    if (!target) {
      return false;
    }

    target.click();

    return true;
  `;
}

/*
 * `innerText` reflects CSS, and much of this interface is set in `uppercase` —
 * so the page reads "VERSION 2026.2" where the source says "Version 2026.2".
 * Every text assertion therefore compares case-insensitively rather than
 * matching whichever casing the stylesheet happens to apply.
 */
const bodyText = `return document.body.innerText.toLowerCase();`;

/** An expression asserting the page's text contains `text`, ignoring case. */
function has(text) {
  return `document.body.innerText.toLowerCase().includes(${JSON.stringify(
    text.toLowerCase(),
  )})`;
}

/** Whether lowercased page text contains `text`. */
function shows(pageText, text) {
  return pageText.includes(text.toLowerCase());
}

/**
 * An expression asserting the validation notice is showing `text`.
 *
 * Scoped to the alert rather than the whole page, because several of these
 * messages read the same as the label of the field they are complaining about —
 * so matching anywhere on the page would pass whether or not it was reported.
 */
function alertHas(text) {
  return `document.querySelector('[role="alert"]')?.innerText.toLowerCase().includes(${JSON.stringify(
    text.toLowerCase(),
  )})`;
}

/** The agreement screen, identified by its controls rather than its prose. */
const AGREEMENT_SCREEN = `
  document.querySelector('input[type="checkbox"]')
    && [...document.querySelectorAll("button")].some((el) =>
      el.textContent.includes("I Accept Agreement"),
    )
`;

/* ------------------------------------------------------------------
   Launch
------------------------------------------------------------------ */

const profile = await mkdtemp(join(tmpdir(), "nadidove-chrome-"));

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--window-size=1400,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function findTarget() {
  const deadline = Date.now() + 20000;

  for (;;) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await response.json();
      const page = targets.find((t) => t.type === "page");

      if (page?.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome is still coming up.
    }

    if (Date.now() > deadline) {
      throw new Error("Chrome did not expose a debugging target");
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

let session;

try {
  session = await Session.open(await findTarget());

  await session.send("Page.enable");
  await session.send("Runtime.enable");
  await session.send("DOM.enable");

  /** Sets real files on the nth file input on the page. */
  async function setFile(index, paths) {
    const { root } = await session.send("DOM.getDocument", { depth: -1 });

    const { nodeIds } = await session.send("DOM.querySelectorAll", {
      nodeId: root.nodeId,
      selector: 'input[type="file"]',
    });

    if (!nodeIds[index]) {
      throw new Error(`no file input at index ${index}`);
    }

    await session.send("DOM.setFileInputFiles", {
      files: paths,
      nodeId: nodeIds[index],
    });
  }

  /* ----------------------------------------------------------------
     1. Welcome — proves hydration produces an interactive screen
  ---------------------------------------------------------------- */

  await session.navigate("/staff/registration");
  await session.waitFor(
    has("Nadidove Staff Registration"),
    "the welcome screen",
  );

  const welcome = await session.eval(bodyText);

  report(
    !shows(welcome, "loading…"),
    "welcome screen hydrates past the loading state",
  );

  report(
    await session.eval(
      `return [...document.querySelectorAll("button")].some((el) =>
         el.textContent.replace(/\\s+/g, "").toLowerCase().startsWith("start"),
       );`,
    ),
    "Start button is present",
  );

  /* ----------------------------------------------------------------
     2. The agreement
  ---------------------------------------------------------------- */

  await session.eval(clickText("Start"));
  await session.waitFor(AGREEMENT_SCREEN, "the agreement");

  const agreementText = await session.eval(bodyText);

  report(
    shows(agreementText, "Version 2026.2"),
    "agreement screen shows the active version",
  );

  /*
   * The document's own heading is deliberately not printed on this screen — the
   * page is already titled with the agreement — so what is checked here is that
   * exactly one heading carries the title. Counting headings rather than
   * occurrences in the text matters because the acceptance checkbox names the
   * agreement too, which is prose and not a second title.
   */
  const titleHeadings = await session.eval(`
    return [...document.querySelectorAll("h1, h2, h3")].filter(
      (el) => el.textContent.trim().toLowerCase() === "nadidove staff agreement",
    ).length;
  `);

  report(
    titleHeadings === 1,
    "the agreement is titled once, not twice",
    `${titleHeadings} heading(s)`,
  );

  report(
    shows(
      agreementText,
      "This Agreement governs the terms and conditions of the Staff Member",
    ),
    "the opening paragraph of the document is shown",
  );

  report(
    shows(agreementText, "PHASE 0") &&
      shows(agreementText, "PHASE 1 – PHASE 4") &&
      shows(agreementText, "OWNERSHIP OF WORK") &&
      shows(agreementText, "CONFIDENTIALITY AND COMMITMENT") &&
      shows(agreementText, "LEAVING THE TEAM"),
    "agreement renders its real sections",
  );

  report(
    shows(agreementText, "₦5,000"),
    "the naira data-support clause renders",
  );

  report(
    shows(agreementText, "₦70,000") && shows(agreementText, "₦250,000"),
    "the Phase 1 and Phase 4 salary clauses render",
  );

  // The accept button must be inert until the box is ticked.
  const lockedBefore = await session.eval(`
    const button = [...document.querySelectorAll("button")].find((el) =>
      el.textContent.includes("I Accept Agreement"),
    );

    return button ? button.disabled : null;
  `);

  report(lockedBefore === true, "accept is disabled before the box is ticked");

  await session.eval(`
    document.querySelector('input[type="checkbox"]').click();

    return true;
  `);

  await session.waitFor(
    `![...document.querySelectorAll("button")].find((el) => el.textContent.includes("I Accept Agreement")).disabled`,
    "accept to become enabled",
  );

  report(true, "ticking the box enables accept");

  await session.eval(clickText("I Accept Agreement"));
  await session.waitFor(has("Personal Information"), "step 1");

  const acceptedAt = await session.eval(
    `return sessionStorage.getItem("nadidove_staff_agreement_accepted_at");`,
  );

  report(
    Boolean(acceptedAt) && !Number.isNaN(Date.parse(acceptedAt)),
    "acceptance timestamp is recorded at the click",
    acceptedAt ?? "absent",
  );

  /* ----------------------------------------------------------------
     3. Step validation refuses an empty step
  ---------------------------------------------------------------- */

  await session.eval(clickText("Next"));
  await session.waitFor(alertHas("is required"), "validation messages");

  report(true, "an empty step is refused with field errors");

  /* ----------------------------------------------------------------
     4. Step 1 — personal, including the compressed passport
  ---------------------------------------------------------------- */

  const stamp = Date.now();
  const email = `browser.${stamp}@nadidove.test`;

  const missing1 = await session.eval(
    fill({
      "field-first-name": "Ifeoma",
      "field-middle-name": "Ngozi",
      "field-last-name-surname": `Adeyemi-${stamp}`,
      "field-date-of-birth": "1994-07-21",
      "field-email-address": email,
      "field-phone-number": "+234 803 555 0199",
    }),
  );

  report(missing1.length === 0, "step 1 fields are all present", missing1.join(","));

  await setFile(0, [`${FIXTURES}/passport.jpg`]);

  // The preview only appears once the canvas compression has resolved.
  await session.waitFor(
    `document.querySelector('img[alt="Passport Photograph"]')`,
    "the compressed passport preview",
  );

  const passportDraft = await session.eval(`
    const img = document.querySelector('img[alt="Passport Photograph"]');

    return { type: img.src.slice(0, 22), length: img.src.length };
  `);

  report(
    passportDraft.type.startsWith("data:image/jpeg;base64"),
    "passport is re-encoded as JPEG in the browser",
    passportDraft.type,
  );

  report(
    passportDraft.length < 900 * 1024 * 1.37,
    "compressed passport is within the draft budget",
    `${Math.round(passportDraft.length / 1024)}KB`,
  );

  await session.eval(clickText("Next"));
  await session.waitFor(has("Professional Information"), "step 2");

  /* ----------------------------------------------------------------
     5. Step 2 — professional, including the conditional education field
  ---------------------------------------------------------------- */

  await session.eval(
    fill({
      "field-state-of-origin": "Enugu",
      "field-current-state": "Lagos",
      "field-current-city": "Ikeja",
      "field-role-at-nadidove": "Production Designer",
      "field-education": "Other",
    }),
  );

  await session.waitFor(
    `document.getElementById("field-please-specify-your-education")`,
    "the conditional education field",
  );

  report(true, 'choosing "Other" reveals the specify field');

  // Leaving it blank must be caught, mirroring the table's constraint.
  await session.eval(clickText("Next"));
  await session.waitFor(
    alertHas("Please specify your education"),
    "the education constraint",
  );

  report(true, '"Other" without a specific value is refused');

  await session.eval(
    fill({ "field-please-specify-your-education": "HND, Mass Communication" }),
  );

  await session.eval(clickText("Next"));
  await session.waitFor(has("Payment Information"), "step 3");

  /* ----------------------------------------------------------------
     6. Step 3 — payment
  ---------------------------------------------------------------- */

  await session.eval(
    fill({
      "field-bank-name": "Access Bank",
      "field-account-number": "0987654321",
      "field-account-name": "Ifeoma Ngozi Adeyemi",
    }),
  );

  await session.eval(clickText("Next"));
  await session.waitFor(has("Required Documents"), "step 4");

  /* ----------------------------------------------------------------
     7. Step 4 — a PDF ID and an image signature
  ---------------------------------------------------------------- */

  await setFile(0, [`${FIXTURES}/id.pdf`]);
  await session.waitFor(has("PDF attached"), "the attached PDF");

  report(true, "a PDF government ID is accepted and passed through");

  await setFile(1, [`${FIXTURES}/signature.jpg`]);
  await session.waitFor(
    `document.querySelector('img[alt="Signature"]')`,
    "the signature preview",
  );

  /* ----------------------------------------------------------------
     8. Review
  ---------------------------------------------------------------- */

  /*
   * The last step goes to the review screen rather than submitting, and its
   * button says so — "Submit" belongs to the review screen, which is the only
   * place a click actually files the registration.
   */
  await session.eval(clickText("Review"));
  await session.waitFor(
    `location.pathname === "/staff/registration/preview" && ${has(
      "Review your registration",
    )}`,
    "the review screen",
  );

  const review = await session.eval(bodyText);

  report(
    !shows(review, "Loading your registration"),
    "review screen reads the draft without a loading flash",
  );

  report(
    shows(review, `Adeyemi-${stamp}`) &&
      shows(review, email) &&
      shows(review, "Access Bank") &&
      shows(review, "0987654321") &&
      shows(review, "Production Designer"),
    "review shows what was entered",
  );

  report(shows(review, "21 July 1994"), "review formats the date of birth");

  report(
    shows(review, "Other — HND, Mass Communication"),
    "review spells out the specified education",
  );

  report(
    (await session.eval(
      `return document.querySelectorAll('section img, div img').length;`,
    )) >= 2,
    "review renders the uploaded document previews",
  );

  /* ----------------------------------------------------------------
     9. The edit round-trip
  ---------------------------------------------------------------- */

  await session.eval(clickText("Edit"));
  await session.waitFor(
    `location.pathname === "/staff/registration" && ${has("Personal Information")}`,
    "the form reopened for editing",
  );

  const reopened = await session.eval(`
    const text = document.body.innerText.toLowerCase();

    return {
      first: document.getElementById("field-first-name")?.value ?? null,
      email: document.getElementById("field-email-address")?.value ?? null,
      kicker: text.includes("editing your registration"),
      agreementSkipped: !text.includes("i accept agreement"),
      passport: Boolean(document.querySelector('img[alt="Passport Photograph"]')),
    };
  `);

  report(
    reopened.first === "Ifeoma" && reopened.email === email,
    "edit reopens the saved answers",
    `${reopened.first} / ${reopened.email}`,
  );

  report(reopened.kicker, "edit mode is labelled as editing");
  report(reopened.agreementSkipped, "edit mode skips welcome and the agreement");
  report(reopened.passport, "the compressed passport survives the round-trip");

  // Change one value, and confirm the change reaches the review screen.
  await session.eval(fill({ "field-phone-number": "+234 701 555 0102" }));

  for (const heading of [
    "Professional Information",
    "Payment Information",
    "Required Documents",
  ]) {
    await session.eval(clickText("Next"));
    await session.waitFor(has(heading), heading);
  }

  await session.eval(clickText("Review"));
  await session.waitFor(
    has("Review your registration"),
    "the review screen again",
  );

  report(
    shows(await session.eval(bodyText), "+234 701 555 0102"),
    "an edit made on the round-trip reaches the review screen",
  );

  /* ----------------------------------------------------------------
     10. Submit, and the completion screen
  ---------------------------------------------------------------- */

  await session.eval(clickText("Submit"));

  await session.waitFor(
    `location.pathname === "/staff/registration/complete"`,
    "the completion screen",
    60000,
  );

  await session.waitFor(
    `${has("Registration complete")} && !${has("Loading your agreement")}`,
    "the completed record",
    60000,
  );

  const complete = await session.eval(bodyText);

  report(
    shows(complete, "Thank you, Ifeoma."),
    "completion greets the applicant by their stored name",
  );

  report(
    shows(complete, "2026.2"),
    "completion shows the accepted agreement version",
  );

  report(
    !shows(complete, "is not available for download yet"),
    "the completed agreement PDF is available",
  );

  const reference = await session.eval(`
    const match = document.body.innerText.toLowerCase().match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );

    return match ? match[0] : null;
  `);

  report(Boolean(reference), "completion shows a reference number", reference ?? "none");

  // The draft is gone, but the id is kept so a reload still finds the record.
  const storage = await session.eval(`
    return {
      draft: sessionStorage.getItem("nadidove_staff_registration"),
      id: sessionStorage.getItem("nadidove_staff_submitted_id"),
    };
  `);

  report(
    storage.draft === null && Boolean(storage.id),
    "the draft is cleared on submission but the reference is kept",
  );

  /* ----------------------------------------------------------------
     11. The PDF the browser can actually fetch, and a reload
  ---------------------------------------------------------------- */

  const pdf = await session.eval(`
    const response = await fetch("/api/staff/${reference}/pdf");
    const buffer = await response.arrayBuffer();
    const head = new TextDecoder().decode(new Uint8Array(buffer).slice(0, 5));

    return {
      status: response.status,
      type: response.headers.get("content-type"),
      disposition: response.headers.get("content-disposition"),
      head,
      bytes: buffer.byteLength,
    };
  `);

  report(
    pdf.status === 200 && pdf.head === "%PDF-",
    "the browser can fetch its completed PDF",
    `${pdf.status} ${pdf.type} ${Math.round(pdf.bytes / 1024)}KB`,
  );

  report(
    pdf.disposition?.startsWith("inline"),
    "the PDF is served inline for the embedded preview",
    pdf.disposition ?? "none",
  );

  const download = await session.eval(`
    const response = await fetch("/api/staff/${reference}/pdf?download");

    return response.headers.get("content-disposition");
  `);

  report(
    download?.startsWith("attachment"),
    "?download switches the PDF to an attachment",
    download ?? "none",
  );

  /*
   * The heading renders before the record has been fetched, so this waits for
   * the reference itself — otherwise it would read the page mid-load and prove
   * nothing about whether the record came back.
   */
  await session.navigate("/staff/registration/complete");
  await session.waitFor(has(reference), "the record after a reload", 30000);

  report(true, "the completion screen survives a reload");

  /* ----------------------------------------------------------------
     12. A direct visit to review, with no draft
  ---------------------------------------------------------------- */

  await session.eval(`
    sessionStorage.clear();

    return true;
  `);

  await session.navigate("/staff/registration/preview");
  await session.waitFor(
    `location.pathname === "/staff/registration"`,
    "the redirect away from an empty review",
  );

  report(true, "review with no draft sends the applicant back to the start");

  /* ----------------------------------------------------------------
     13. Nothing logged an error along the way
  ---------------------------------------------------------------- */

  /*
   * Headless Chrome has no PDF plugin, so the embedded preview cannot paint and
   * says so on the console. That one class of message is excluded — and what was
   * excluded is printed, so the exclusion can't quietly swallow a real error.
   */
  const ignorable = /pdf|plugin|net::ERR_BLOCKED/i;

  const noise = session.problems.filter((problem) => !ignorable.test(problem));
  const ignored = session.problems.filter((problem) => ignorable.test(problem));

  if (ignored.length > 0) {
    console.log(`      ignored ${ignored.length} PDF-plugin message(s): ${ignored[0].slice(0, 120)}`);
  }

  report(
    noise.length === 0,
    "no console errors or uncaught exceptions during the flow",
    noise.slice(0, 4).join(" | "),
  );
} catch (error) {
  report(false, "the flow ran to completion", error.message);
} finally {
  session?.close();
  chrome.kill("SIGKILL");
  await rm(profile, { recursive: true, force: true });
}

console.log(`\n${failures === 0 ? "All browser checks passed" : `${failures} browser check(s) failed`}`);

process.exit(failures === 0 ? 0 : 1);
