/**
 * The Nadidove Staff Agreement.
 *
 * The copy below is transcribed verbatim from `Nadidove_Staff_Agreement.pdf`.
 * One part of the source document is deliberately absent: the closing
 * SIGNATURES block, which exists in the PDF as blanks to be filled in by hand.
 * The registration captures the same facts as structured data — the staff
 * member's full name, their uploaded signature, and the timestamped acceptance
 * record — so reproducing the blanks here would ask for the same information
 * twice.
 *
 * Nothing else is summarised, reworded or reordered. This module is the single
 * source of truth: the agreement screen renders it, `agreementPlainText()`
 * derives the copy stored on the `agreements` row, and the completed PDF
 * prints it. A change to the wording is a change to `AGREEMENT_VERSION`.
 */

export const AGREEMENT_TITLE = "Nadidove Staff Agreement";

/**
 * The heading as it reads on the source document. Kept separate from the title
 * so the agreement screen and the PDF can show the document's own wording
 * rather than a tidied-up version of it.
 */
export const AGREEMENT_DOCUMENT_HEADING = "NADIDOVE STAFF AGREEMENT";

/**
 * Bump this whenever the copy below changes. Acceptances record the version
 * they were given, so an old record keeps pointing at the wording that person
 * actually read.
 */
export const AGREEMENT_VERSION = "2026.2";

/** The unnumbered paragraph the document opens with, above section 1. */
export const AGREEMENT_PREAMBLE =
  "This Agreement governs the terms and conditions of the Staff Member’s engagement with Nadidove Studio throughout its incubation and growth phases.";

export interface AgreementClause {
  /** "1.1", "2.7" … Absent on the unnumbered lead-in paragraphs. */
  number?: string;
  text: string;
  /**
   * Further paragraphs of the same clause, printed under `text` without
   * repeating the number. Clause 2.1 is the only one that has any.
   */
  continued?: string[];
}

export interface AgreementSection {
  /** "1", "2" … matches the numbering on the source document. */
  number: string;
  heading: string;
  clauses: AgreementClause[];
}

export const AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    number: "1",
    heading: "PHASE 0",
    clauses: [
      {
        text: "This is the first phase and the terms and arrangements applicable during this phase are set out below:",
      },
      {
        number: "1.1",
        text: "Phase 0 is the startup and foundation period of Nadidove and is designed to last for a maximum of twelve (12) months.",
      },
      {
        number: "1.2",
        text: "Phase 0 shall end earlier if Nadidove Studio achieves a monthly revenue of ₦1,000,000 consistently for three (3) consecutive months. This shall demonstrate the company’s ability to consistently generate the required revenue, upon which Phase 1 shall commence.",
      },
      {
        number: "1.3",
        text: "During Phase 0, the Staff Member shall receive ₦5,000 monthly as Internet data support from Nadidove Management.",
      },
      {
        number: "1.4",
        text: "Each qualifying month completed during Phase 0 shall accrue ₦30,000 as a deferred project-linked bonus for the Staff Member, provided that the Staff Member was actively involved and satisfactorily discharged his or her assigned workload for that month.",
      },
      {
        number: "1.5",
        text: "The deferred bonus shall not become immediately payable upon the commencement of Phase 1. The accumulated amount shall be recorded, and a payment arrangement shall be agreed upon after the transition to Phase 1.",
      },
      {
        number: "1.6",
        text: "If Phase 0 fails completely and Nadidove is discontinued or changes direction from the initial business model governed by this Agreement, the deferred Phase 0 bonus shall lapse. In such circumstances, no Phase 0 bonus shall be payable.",
      },
      {
        number: "1.7",
        text: "If Nadidove restarts after such failure or changes its business direction following the failure, any bonus accrued during the initial Phase 0 shall no longer be counted. Nadidove shall be regarded as having taken a new direction, and a new agreement governing the new phase shall be drafted.",
      },
    ],
  },
  {
    number: "2",
    heading: "PHASE 1 – PHASE 4",
    clauses: [
      {
        text: "Upon the commencement of Phase 1 and through Phase 4, the Staff Member’s monthly salary shall commence and increase according to Nadidove’s revenue milestones as follows:",
      },
      {
        number: "2.1",
        text: "PHASE 1: Phase 1 commences when Nadidove generates ₦1,000,000 in monthly revenue consistently for three (3) consecutive months. At this point, the Staff Member shall earn a monthly salary of ₦70,000, commencing from the month immediately following the completion of the three (3) consecutive months.",
        continued: [
          "During this period, a meeting shall be held to determine how the Staff Member’s deferred Phase 0 bonus of ₦30,000 per qualifying month shall be paid.",
        ],
      },
      {
        number: "2.2",
        text: "PHASE 2: Phase 2 commences when Nadidove generates ₦2,000,000 in monthly revenue consistently for three (3) consecutive months. At this stage, the Staff Member’s monthly salary shall increase to ₦120,000.",
      },
      {
        number: "2.3",
        text: "PHASE 3: Phase 3 commences when Nadidove generates ₦3,500,000 in monthly revenue consistently for three (3) consecutive months. At this stage, the Staff Member’s monthly salary shall increase to ₦180,000.",
      },
      {
        number: "2.4",
        text: "PHASE 4: Phase 4 commences when Nadidove generates ₦5,000,000 in monthly revenue consistently for three (3) consecutive months. At this stage, the Staff Member’s monthly salary shall increase to ₦250,000.",
      },
      {
        number: "2.5",
        text: "At Phase 4, automatic salary increases based solely on Nadidove’s revenue milestones shall stop, as the company will have reached a stage of expansion. Thereafter, salary increases shall be based on the Staff Member’s output and performance. The company shall also create more departments and appoint heads of the various departments as the company expands.",
      },
      {
        number: "2.6",
        text: "The salary increases from Phase 1 to Phase 4 are intended to recognise and compensate the Staff Members who started working with Nadidove during Phase 0.",
      },
    ],
  },
  {
    number: "3",
    heading: "OWNERSHIP OF WORK",
    clauses: [
      {
        number: "3.1",
        text: "All stories, screenplays, characters, visual designs, images, videos, audio, music, footage, graphics, promotional materials, project files and other creative materials specifically created for Nadidove Studio in the course of the Staff Member’s work shall belong to and remain under the control of Nadidove Management.",
      },
      {
        number: "3.2",
        text: "The Staff Member shall not sell, reproduce, publish, distribute or use Nadidove-specific creative materials for another person, brand or business without the express permission of Nadidove Management.",
      },
      {
        number: "3.3",
        text: "Nadidove-specific production processes, workflows, creative methods and ideas shall remain confidential and shall not be shared with another brand or person.",
      },
    ],
  },
  {
    number: "4",
    heading: "CONFIDENTIALITY AND COMMITMENT",
    clauses: [
      {
        number: "4.1",
        text: "The Staff Member agrees to keep all private and confidential information relating to Nadidove Studio, including unreleased content, stories, scripts, business plans, revenue information, account details, production processes and other information obtained through work with Nadidove, confidential.",
      },
      {
        number: "4.2",
        text: "The Staff Member agrees to perform his or her duties diligently, meet agreed deadlines and cooperate with the team to maintain the progress and development of Nadidove Studio.",
      },
      {
        number: "4.3",
        text: "The Staff Member shall not deliberately abandon assigned work or withhold Nadidove’s materials in a manner that disrupts the work of the team.",
      },
    ],
  },
  {
    number: "5",
    heading: "LEAVING THE TEAM",
    clauses: [
      {
        number: "5.1",
        text: "A Staff Member who wishes to leave Nadidove shall give the Management three (3) months’ written notice prior to the date he or she intends to stop working.",
      },
      {
        number: "5.2",
        text: "Before leaving, the Staff Member shall hand over all Nadidove work, files, materials and other property in his or her possession.",
      },
      {
        number: "5.3",
        text: "A Staff Member who leaves Nadidove shall continue to respect the confidentiality and ownership rights contained in this Agreement.",
      },
      {
        number: "5.4",
        text: "The Management of Nadidove has the sole right to terminate the Staff Member’s engagement upon the Staff Member’s failure to fulfil his or her duties, failure to abide by this Agreement, or conduct that jeopardises Nadidove.",
      },
    ],
  },
  {
    number: "6",
    heading: "AGREEMENT",
    clauses: [
      {
        number: "6.1",
        text: "By signing this Agreement, the Staff Member confirms that he or she has read, understood and agreed to the terms contained herein.",
      },
      {
        number: "6.2",
        text: "The Parties agree to work together towards the growth and success of Nadidove Studio.",
      },
    ],
  },
];

/** Every paragraph of a clause in printed order, the number carried by the first. */
export function clauseParagraphs(clause: AgreementClause): string[] {
  return [clause.text, ...(clause.continued ?? [])];
}

/**
 * The agreement as flat text.
 *
 * This is what gets written to `agreements.content`, so the database holds a
 * literal copy of the wording each person accepted rather than a foreign key
 * into application code that may since have moved on.
 */
export function agreementPlainText(): string {
  const lines: string[] = [
    AGREEMENT_DOCUMENT_HEADING,
    "",
    AGREEMENT_PREAMBLE,
    "",
  ];

  for (const section of AGREEMENT_SECTIONS) {
    lines.push(`${section.number}. ${section.heading}`, "");

    for (const clause of section.clauses) {
      const [first, ...rest] = clauseParagraphs(clause);

      lines.push(clause.number ? `${clause.number} ${first}` : first, "");

      for (const paragraph of rest) {
        lines.push(paragraph, "");
      }
    }
  }

  return lines.join("\n").trimEnd();
}

/** The shape the agreement screen and the API exchange. */
export interface AgreementRecord {
  id: string;
  title: string;
  version: string;
  content: string;
  is_active: boolean;
}
