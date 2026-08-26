/**
 * Builds the completed agreement PDF: the agreement itself, the parties, the
 * registration details, the uploaded documents, and the acceptance record —
 * one file that stands on its own as the signed copy.
 *
 * Layout mirrors the source Word/PDF document: A4, Helvetica, a 57pt margin,
 * 14pt bold title, 10.5pt bold section headings, 9.2pt body.
 */
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

import {
  AGREEMENT_DOCUMENT_HEADING,
  AGREEMENT_PREAMBLE,
  AGREEMENT_SECTIONS,
  AGREEMENT_VERSION,
  type AgreementClause,
  clauseParagraphs,
} from "./agreement";
import {
  type NormalisedRegistration,
  type UploadData,
  decodeUpload,
  fullName,
} from "./registration";

const A4: [number, number] = [595.276, 841.89];
const MARGIN = 57.02;

const BODY_SIZE = 9.2;
const HEADING_SIZE = 10.5;
const TITLE_SIZE = 14;

const LINE_HEIGHT = 12.5;

const INK = rgb(0, 0, 0);
const MUTED = rgb(0.35, 0.35, 0.35);
const RULE = rgb(0.78, 0.78, 0.78);
const BRAND = rgb(0.843, 0.098, 0.184); // #D7192F

export interface CompletedPdfInput {
  staffId: string;
  registration: NormalisedRegistration;
  passport: UploadData | null;
  governmentId: UploadData | null;
  signature: UploadData | null;
  /** ISO timestamp the agreement was accepted. */
  acceptedAt: string;
  /** ISO timestamp the registration was submitted. */
  submittedAt: string;
}

/**
 * A cursor over a growing document.
 *
 * Every draw call goes through this so page breaks happen in one place: ask for
 * room, get a page and a baseline, draw. Nothing else tracks `y`.
 */
class Writer {
  private readonly doc: PDFDocument;
  private page: PDFPage;
  private y: number;

  readonly regular: PDFFont;
  readonly bold: PDFFont;
  readonly width: number;
  readonly contentWidth: number;

  constructor(doc: PDFDocument, regular: PDFFont, bold: PDFFont) {
    this.doc = doc;
    this.regular = regular;
    this.bold = bold;

    this.page = doc.addPage(A4);
    this.width = A4[0];
    this.contentWidth = this.width - MARGIN * 2;
    this.y = A4[1] - MARGIN;
  }

  /** Starts a fresh page and returns it — used for the document's own sections. */
  newPage(): void {
    this.page = this.doc.addPage(A4);
    this.y = A4[1] - MARGIN;
  }

  /** Reserves vertical room, breaking to a new page when it won't fit. */
  private reserve(height: number): { page: PDFPage; top: number } {
    if (this.y - height < MARGIN) {
      this.newPage();
    }

    const top = this.y;
    this.y -= height;

    return { page: this.page, top };
  }

  space(height: number): void {
    // A gap at the very top of a page would just push content down for no
    // reason, so it's absorbed instead.
    if (this.y < A4[1] - MARGIN) {
      this.y -= height;
    }
  }

  /**
   * Width of a string as it will actually be drawn. `₦` is measured as `N`
   * because that is how it gets drawn — see `drawNaira`.
   */
  measure(text: string, size: number, font: PDFFont): number {
    return font.widthOfTextAtSize(text.replaceAll("₦", "N"), size);
  }

  /** Greedy wrap at word boundaries, with a hard break for unbroken runs. */
  wrap(text: string, size: number, font: PDFFont, width: number): string[] {
    const lines: string[] = [];
    let line = "";

    for (const word of text.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;

      if (this.measure(candidate, size, font) <= width || !line) {
        line = candidate;
        continue;
      }

      lines.push(line);
      line = word;
    }

    if (line) {
      lines.push(line);
    }

    return lines.length > 0 ? lines : [""];
  }

  /**
   * Draws one line, substituting a hand-built `₦`.
   *
   * The 14 standard PDF fonts are WinAnsi-encoded and WinAnsi has no naira
   * sign, so pdf-lib cannot draw the character. Since a naira sign *is* an `N`
   * with two bars through it, it is drawn as exactly that — an `N` plus two
   * thin rectangles — which keeps the amounts reading as currency rather than
   * degrading them to "NGN".
   */
  private drawLine(
    page: PDFPage,
    text: string,
    x: number,
    baseline: number,
    size: number,
    font: PDFFont,
    color = INK,
  ): void {
    const segments = text.split("₦");
    let cursor = x;

    segments.forEach((segment, index) => {
      if (index > 0) {
        this.drawNaira(page, cursor, baseline, size, font, color);
        cursor += font.widthOfTextAtSize("N", size);
      }

      if (segment) {
        page.drawText(segment, { x: cursor, y: baseline, size, font, color });
        cursor += font.widthOfTextAtSize(segment, size);
      }
    });
  }

  private drawNaira(
    page: PDFPage,
    x: number,
    baseline: number,
    size: number,
    font: PDFFont,
    color: ReturnType<typeof rgb>,
  ): void {
    page.drawText("N", { x, y: baseline, size, font, color });

    const glyphWidth = font.widthOfTextAtSize("N", size);
    const thickness = Math.max(0.45, size * 0.055);
    const capHeight = size * 0.72;

    for (const fraction of [0.34, 0.58]) {
      page.drawRectangle({
        x: x - size * 0.045,
        y: baseline + capHeight * fraction,
        width: glyphWidth + size * 0.09,
        height: thickness,
        color,
      });
    }
  }

  /** A wrapped paragraph, optionally indented and hung off a label. */
  paragraph(
    text: string,
    options: {
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      /** Printed once at the left of the first line, e.g. a clause number. */
      hanging?: string;
      leading?: number;
    } = {},
  ): void {
    const size = options.size ?? BODY_SIZE;
    const font = options.bold ? this.bold : this.regular;
    const color = options.color ?? INK;
    const leading = options.leading ?? LINE_HEIGHT;

    const hanging = options.hanging ?? "";
    const hangingWidth = hanging
      ? this.measure(`${hanging} `, size, this.regular)
      : 0;

    const left = MARGIN + (options.indent ?? 0);
    const textLeft = left + hangingWidth;
    const width = this.width - MARGIN - textLeft;

    const lines = this.wrap(text, size, font, width);

    lines.forEach((line, index) => {
      const { page, top } = this.reserve(leading);
      const baseline = top - size;

      if (index === 0 && hanging) {
        this.drawLine(page, hanging, left, baseline, size, this.regular, color);
      }

      this.drawLine(page, line, textLeft, baseline, size, font, color);
    });
  }

  /** A section heading with the space above and below it. */
  heading(text: string, options: { size?: number } = {}): void {
    const size = options.size ?? HEADING_SIZE;

    this.space(8);

    const { page, top } = this.reserve(size + 5);

    this.drawLine(page, text, MARGIN, top - size, size, this.bold);

    this.space(2);
  }

  /** A hairline across the content column. */
  rule(): void {
    this.space(6);

    const { page, top } = this.reserve(1);

    page.drawRectangle({
      x: MARGIN,
      y: top,
      width: this.contentWidth,
      height: 0.6,
      color: RULE,
    });

    this.space(8);
  }

  /** A label above its value, stacked — reads well at any column width. */
  field(label: string, value: string, options: { indent?: number } = {}): void {
    this.paragraph(label.toUpperCase(), {
      size: 7.2,
      color: MUTED,
      leading: 9.5,
      indent: options.indent,
    });

    this.paragraph(value || "—", {
      size: BODY_SIZE,
      indent: options.indent,
    });

    this.space(6);
  }

  /**
   * Places an image, scaled to fit the given box, and returns the height it
   * used. Breaks to a new page first if the box won't fit.
   */
  image(
    embedded: { width: number; height: number },
    draw: (page: PDFPage, box: { x: number; y: number; width: number; height: number }) => void,
    maxWidth: number,
    maxHeight: number,
  ): void {
    const scale = Math.min(
      maxWidth / embedded.width,
      maxHeight / embedded.height,
      1,
    );

    const width = embedded.width * scale;
    const height = embedded.height * scale;

    const { page, top } = this.reserve(height + 6);

    draw(page, { x: MARGIN, y: top - height, width, height });
  }
}

function formatDate(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return `${formatDate(iso)} at ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;
}

/**
 * Draws every clause of a section. A clause number hangs off the first
 * paragraph only; any further paragraphs of the same clause are indented to
 * sit under it.
 */
function drawSectionBody(writer: Writer, clauses: AgreementClause[]): void {
  for (const clause of clauses) {
    const [first, ...rest] = clauseParagraphs(clause);

    writer.paragraph(first, { hanging: clause.number });

    // The same width `paragraph()` reserves for a hanging number, so a
    // continuation paragraph lines up under the clause text above it.
    const indent = clause.number
      ? writer.measure(`${clause.number} `, BODY_SIZE, writer.regular)
      : 0;

    for (const paragraph of rest) {
      writer.space(4);
      writer.paragraph(paragraph, { indent });
    }

    writer.space(4);
  }
}

/**
 * Embeds an image upload. Returns `null` for anything pdf-lib cannot embed —
 * in practice this is only reached if an upload bypasses the browser-side
 * conversion, which re-encodes every image to JPEG.
 */
async function embedImage(
  doc: PDFDocument,
  upload: UploadData,
  label: string,
) {
  const { bytes, contentType } = decodeUpload(upload, label);

  if (contentType === "image/jpeg") {
    return doc.embedJpg(bytes);
  }

  if (contentType === "image/png") {
    return doc.embedPng(bytes);
  }

  return null;
}

export async function buildCompletedAgreementPdf(
  input: CompletedPdfInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const person = fullName({
    first_name: input.registration.first_name,
    middle_name: input.registration.middle_name ?? "",
    last_name: input.registration.last_name,
  });

  doc.setTitle(`Nadidove Staff Agreement — ${person}`);
  doc.setAuthor("Nadidove Studio");
  doc.setSubject("Completed staff agreement");
  doc.setCreator("Nadidove Staff Registration Portal");

  const writer = new Writer(doc, regular, bold);

  /* ------------------------------------------------------------
     Title
  ------------------------------------------------------------ */

  writer.paragraph(AGREEMENT_DOCUMENT_HEADING, {
    size: TITLE_SIZE,
    bold: true,
    leading: 17,
  });

  writer.space(6);

  writer.paragraph(
    `Version ${AGREEMENT_VERSION}  ·  Accepted ${formatDateTime(input.acceptedAt)}`,
    { size: 7.8, color: MUTED, leading: 10 },
  );

  writer.rule();

  /* ------------------------------------------------------------
     Parties

     The source document leaves these blank to be written in. The
     registration collected them, so the completed copy states them.
  ------------------------------------------------------------ */

  writer.heading("PARTIES");

  writer.paragraph("Studio", { size: 7.2, color: MUTED, leading: 9.5 });
  writer.paragraph("Nadidove Studio, represented by Nadidove Management");
  writer.space(6);

  writer.paragraph("Staff Member", { size: 7.2, color: MUTED, leading: 9.5 });
  writer.paragraph(person);

  writer.space(8);

  /* ------------------------------------------------------------
     The agreement
  ------------------------------------------------------------ */

  writer.paragraph(AGREEMENT_PREAMBLE);
  writer.space(6);

  for (const section of AGREEMENT_SECTIONS) {
    writer.heading(`${section.number}. ${section.heading}`);

    drawSectionBody(writer, section.clauses);
  }

  /* ------------------------------------------------------------
     Execution

     Section 6.1 turns on the staff member having read and agreed, so
     the evidence of that sits directly after the terms.
  ------------------------------------------------------------ */

  writer.newPage();

  writer.paragraph("EXECUTION", { size: TITLE_SIZE, bold: true, leading: 17 });
  writer.rule();

  writer.heading("NADIDOVE MANAGEMENT");
  writer.field("Name", "Nelson Edeh Chukwuemeka");
  writer.field("For", "Nadidove Studio");

  writer.space(10);

  writer.heading("STAFF MEMBER");
  writer.field("Full name", person);
  writer.field("Agreement accepted", formatDateTime(input.acceptedAt));
  writer.field("Registration submitted", formatDateTime(input.submittedAt));

  if (input.signature) {
    writer.paragraph("SIGNATURE", { size: 7.2, color: MUTED, leading: 9.5 });

    const signature = await embedImage(doc, input.signature, "Signature");

    if (signature) {
      writer.image(
        signature,
        (page, box) => page.drawImage(signature, box),
        220,
        80,
      );
    } else {
      writer.paragraph("Signature uploaded — see attached document.", {
        color: MUTED,
      });
    }

    writer.space(8);
  }

  writer.paragraph(
    `The Staff Member accepted this Agreement, version ${AGREEMENT_VERSION}, through the Nadidove Staff Registration Portal on ${formatDateTime(input.acceptedAt)}. Record reference ${input.staffId}.`,
    { size: 7.8, color: MUTED, leading: 10.5 },
  );

  /* ------------------------------------------------------------
     Registration details
  ------------------------------------------------------------ */

  const registration = input.registration;

  writer.newPage();

  writer.paragraph("REGISTRATION DETAILS", {
    size: TITLE_SIZE,
    bold: true,
    leading: 17,
  });
  writer.rule();

  writer.heading("PERSONAL INFORMATION");
  writer.field("First name", registration.first_name);
  writer.field("Middle name", registration.middle_name ?? "—");
  writer.field("Last name / surname", registration.last_name);
  writer.field("Date of birth", formatDate(registration.date_of_birth));
  writer.field("Email address", registration.email);
  writer.field("Phone number", registration.phone_number);

  writer.space(8);

  writer.heading("PROFESSIONAL INFORMATION");
  writer.field("State of origin", registration.state_of_origin);
  writer.field("Current state", registration.current_state);
  writer.field("Current city", registration.current_city);
  writer.field("Role", registration.role);
  writer.field(
    "Education",
    registration.education === "Other" && registration.education_other
      ? `Other — ${registration.education_other}`
      : registration.education,
  );

  writer.space(8);

  writer.heading("PAYMENT INFORMATION");
  writer.field("Bank name", registration.bank_name);
  writer.field("Account number", registration.account_number);
  writer.field("Account name", registration.account_name);

  /* ------------------------------------------------------------
     Documents
  ------------------------------------------------------------ */

  writer.newPage();

  writer.paragraph("DOCUMENTS", { size: TITLE_SIZE, bold: true, leading: 17 });
  writer.rule();

  if (input.passport) {
    writer.heading("PASSPORT PHOTOGRAPH");

    const passport = await embedImage(doc, input.passport, "Passport photograph");

    if (passport) {
      writer.image(
        passport,
        (page, box) => page.drawImage(passport, box),
        200,
        250,
      );
    } else {
      writer.paragraph("Uploaded — see attached document.", { color: MUTED });
    }

    writer.space(14);
  }

  /*
   * A government ID can be an image or a PDF. Images are placed inline; a PDF
   * is appended as its own pages, because re-rasterising someone's ID would
   * lose the detail that makes it checkable.
   */
  const appendedPdfPages: Uint8Array[] = [];

  if (input.governmentId) {
    writer.heading("GOVERNMENT ID");

    const decoded = decodeUpload(input.governmentId, "Government ID");

    if (decoded.contentType === "application/pdf") {
      appendedPdfPages.push(decoded.bytes);

      writer.paragraph(
        `Uploaded as a PDF (${input.governmentId.name}) and attached to the following pages of this document.`,
        { color: MUTED },
      );
    } else {
      const governmentId = await embedImage(
        doc,
        input.governmentId,
        "Government ID",
      );

      if (governmentId) {
        writer.image(
          governmentId,
          (page, box) => page.drawImage(governmentId, box),
          writer.contentWidth,
          380,
        );
      } else {
        writer.paragraph("Uploaded — see attached document.", { color: MUTED });
      }
    }
  }

  for (const pdfBytes of appendedPdfPages) {
    try {
      const source = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
      });

      const pages = await doc.copyPages(source, source.getPageIndices());

      for (const page of pages) {
        doc.addPage(page);
      }
    } catch {
      // A PDF we cannot parse is still stored in its original form in the
      // documents bucket, so say where to find it rather than failing the
      // whole submission.
      const note = new Writer(doc, regular, bold);

      note.paragraph("GOVERNMENT ID", { size: HEADING_SIZE, bold: true });
      note.space(4);
      note.paragraph(
        "The uploaded PDF could not be embedded in this document. The original file is stored with this registration and can be downloaded from the staff records.",
        { color: MUTED },
      );
    }
  }

  /* ------------------------------------------------------------
     Footer on every page
  ------------------------------------------------------------ */

  const pages = doc.getPages();

  pages.forEach((page, index) => {
    const label = `Nadidove Studio  ·  ${person}  ·  Page ${index + 1} of ${pages.length}`;

    page.drawText(label, {
      x: MARGIN,
      y: MARGIN - 22,
      size: 6.8,
      font: regular,
      color: MUTED,
    });

    page.drawRectangle({
      x: MARGIN,
      y: MARGIN - 12,
      width: 24,
      height: 1.6,
      color: BRAND,
    });
  });

  return doc.save();
}

/** Storage-safe file name for a completed agreement. */
export function completedPdfFileName(
  person: string,
  staffId: string,
): string {
  const slug = person
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "staff-member"}-${staffId.slice(0, 8)}-agreement.pdf`;
}
