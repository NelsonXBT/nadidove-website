/**
 * The Nadidove Films Team and Employment Agreement.
 *
 * The copy below is transcribed verbatim from
 * `Nadidove_Films_Individual_Team_Agreement_Updated.pdf`. Two parts of the
 * source document are deliberately absent:
 *
 *   - the opening date/parties block ("This Agreement is made on the ___ day
 *     of __________ 2026 … BETWEEN … AND …"), and
 *   - the closing SIGNATURES block.
 *
 * Both exist in the PDF as blanks to be filled in by hand. The registration
 * captures the same facts as structured data — the team member's full name,
 * their uploaded signature, and the timestamped acceptance record — so
 * reproducing the blanks here would ask for the same information twice.
 *
 * Nothing else is summarised, reworded or reordered. This module is the single
 * source of truth: the agreement screen renders it, `agreementPlainText()`
 * derives the copy stored on the `agreements` row, and the completed PDF
 * prints it. A change to the wording is a change to `AGREEMENT_VERSION`.
 */

export const AGREEMENT_TITLE = "Nadidove Films — Team and Employment Agreement";

/**
 * The heading as it reads on the source document. Kept separate from the
 * title so the agreement screen and the PDF can show the document's own
 * wording, "DRAFT" included, rather than a tidied-up version of it.
 */
export const AGREEMENT_DOCUMENT_HEADING = "TEAM AND EMPLOYMENT AGREEMENT — DRAFT";

/**
 * Bump this whenever the copy below changes. Acceptances record the version
 * they were given, so an old record keeps pointing at the wording that person
 * actually read.
 */
export const AGREEMENT_VERSION = "2026.1";

export interface AgreementClause {
  /** "1.1", "2.7" … Absent on the unnumbered lead-in paragraphs. */
  number?: string;
  text: string;
}

export interface AgreementTable {
  columns: [string, string];
  rows: [string, string][];
}

export interface AgreementSection {
  /** "1", "2" … matches the numbering on the source document. */
  number: string;
  heading: string;
  clauses: AgreementClause[];
  /** Section 3 carries the salary table between its lead-in and its clauses. */
  table?: AgreementTable;
  /** Clauses printed after the table rather than before it. */
  clausesAfterTable?: AgreementClause[];
}

export const AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    number: "1",
    heading: "PURPOSE",
    clauses: [
      {
        number: "1.1",
        text: "The Founder has established Nadidove Films and has formed a team to work together in developing and producing content for Nadidove Films.",
      },
      {
        number: "1.2",
        text: "This Agreement sets out the basic terms agreed between the Founder and the Team Member and is intended to ensure commitment, clarity and accountability.",
      },
      {
        number: "1.3",
        text: "Nadidove Films is owned and controlled by the Founder, Nelson Edeh Chukwuemeka. Nothing in this Agreement gives the Team Member ownership, equity or profit-sharing rights in Nadidove Films.",
      },
    ],
  },
  {
    number: "2",
    heading: "PHASE 0",
    clauses: [
      {
        number: "2.1",
        text: "Phase 0 is the startup and foundation period of Nadidove Films and may last for a maximum of twelve (12) months.",
      },
      {
        number: "2.2",
        text: "Phase 0 shall end earlier if Nadidove Films reaches ₦1,000,000 monthly revenue, at which point Phase 1 shall begin.",
      },
      {
        number: "2.3",
        text: "During Phase 0, the Team Member shall receive ₦5,000 monthly data support.",
      },
      {
        number: "2.4",
        text: "Each qualifying month completed during Phase 0 shall accrue ₦30,000 as a deferred project-linked bonus for the Team Member.",
      },
      {
        number: "2.5",
        text: "The deferred bonus shall not be immediately payable upon the commencement of Phase 1. The accumulated amount shall be recorded and a payment arrangement shall be agreed upon after the transition to Phase 1.",
      },
      {
        number: "2.6",
        text: "If Phase 0 fails completely and Nadidove Films is discontinued, the deferred Phase 0 bonus shall lapse.",
      },
      {
        number: "2.7",
        text: "A Team Member who leaves after such failure and discontinuation shall not be entitled to the deferred Phase 0 bonus.",
      },
    ],
  },
  {
    number: "3",
    heading: "PHASE 1 — SALARY STRUCTURE",
    clauses: [
      {
        text: "Upon commencement of Phase 1, the monthly salary of the Team Member shall be based on Nadidove Films' monthly revenue as follows:",
      },
    ],
    table: {
      columns: ["Monthly Revenue", "Salary"],
      rows: [
        ["₦1,000,000 – ₦1,999,999", "₦70,000"],
        ["₦2,000,000 – ₦3,499,999", "₦120,000"],
        ["₦3,500,000 – ₦4,999,999", "₦180,000"],
        ["₦5,000,000 and above", "₦250,000"],
      ],
    },
    clausesAfterTable: [
      {
        number: "3.1",
        text: "The applicable salary shall be paid to the Team Member.",
      },
      {
        number: "3.2",
        text: "These salary milestones are compensation arrangements only and do not give the Team Member ownership or profit-sharing rights in Nadidove Films.",
      },
    ],
  },
  {
    number: "4",
    heading: "OWNERSHIP OF WORK",
    clauses: [
      {
        number: "4.1",
        text: "All stories, screenplays, characters, visual designs, images, videos, footage, graphics, promotional materials, project files and other creative materials specifically created for Nadidove Films in the course of the Team Member's work shall belong to and remain under the control of the Founder/Nadidove Films.",
      },
      {
        number: "4.2",
        text: "The Team Member shall not sell, reproduce, publish, distribute or use Nadidove-specific creative materials for another person, brand or business without the Founder's permission.",
      },
      {
        number: "4.3",
        text: "Nadidove-specific production processes, workflows and creative methods shall remain confidential and shall not be shared with another brand.",
      },
    ],
  },
  {
    number: "5",
    heading: "CONFIDENTIALITY AND COMMITMENT",
    clauses: [
      {
        number: "5.1",
        text: "The Team Member agrees to keep confidential all private information relating to Nadidove Films, including unreleased content, stories, scripts, business plans, revenue information, account details, production processes and other information obtained through work with Nadidove.",
      },
      {
        number: "5.2",
        text: "The Team Member agrees to perform his or her duties diligently, meet agreed deadlines and cooperate with the team to maintain the progress of Nadidove Films.",
      },
      {
        number: "5.3",
        text: "The Team Member shall not deliberately abandon assigned work or withhold Nadidove materials in a manner that disrupts the team's work.",
      },
    ],
  },
  {
    number: "6",
    heading: "LEAVING THE TEAM",
    clauses: [
      {
        number: "6.1",
        text: "A Team Member who wishes to leave Nadidove Films shall give the Management three (3) months' written notice.",
      },
      {
        number: "6.2",
        text: "Before leaving, the Team Member shall hand over all Nadidove work, files, materials and other property in his or her possession.",
      },
      {
        number: "6.3",
        text: "A Team Member who leaves shall continue to respect the confidentiality and ownership provisions contained in this Agreement.",
      },
      {
        number: "6.4",
        text: "The Management of Nadidove may terminate the Team Member's engagement by written notice.",
      },
    ],
  },
  {
    number: "7",
    heading: "AGREEMENT",
    clauses: [
      {
        number: "7.1",
        text: "By signing this Agreement, the Team Member confirms that he or she has read, understood and agreed to the terms contained herein.",
      },
      {
        number: "7.2",
        text: "The Parties agree to work together towards the growth and success of Nadidove Films.",
      },
    ],
  },
];

/** Every clause of a section in printed order, table position accounted for. */
export function sectionClauses(section: AgreementSection): AgreementClause[] {
  return [...section.clauses, ...(section.clausesAfterTable ?? [])];
}

/**
 * The agreement as flat text.
 *
 * This is what gets written to `agreements.content`, so the database holds a
 * literal copy of the wording each person accepted rather than a foreign key
 * into application code that may since have moved on.
 */
export function agreementPlainText(): string {
  const lines: string[] = [AGREEMENT_DOCUMENT_HEADING, ""];

  for (const section of AGREEMENT_SECTIONS) {
    lines.push(`${section.number}. ${section.heading}`, "");

    const push = (clauses: AgreementClause[]) => {
      for (const clause of clauses) {
        lines.push(
          clause.number ? `${clause.number} ${clause.text}` : clause.text,
          "",
        );
      }
    };

    push(section.clauses);

    if (section.table) {
      lines.push(`${section.table.columns[0]} — ${section.table.columns[1]}`);

      for (const [revenue, salary] of section.table.rows) {
        lines.push(`${revenue} — ${salary}`);
      }

      lines.push("");
    }

    push(section.clausesAfterTable ?? []);
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
