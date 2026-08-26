import {
  AGREEMENT_SECTIONS,
  type AgreementClause,
  clauseParagraphs,
} from "@/lib/staff/agreement";

/**
 * The agreement, rendered from its structured source.
 *
 * `lib/staff/agreement.ts` holds the wording transcribed from
 * `Nadidove_Staff_Agreement.pdf`, clause by clause. It is rendered from that
 * structure rather than from the flat `content` string on the `agreements` row,
 * so numbered clauses hang in their own column instead of collapsing into a run
 * of text.
 *
 * The row still carries the same wording — `agreementPlainText()` derives it
 * from this module — so what a person reads here is what their acceptance
 * record points at.
 *
 * The document's opening paragraph is not printed here: the agreement screen
 * shows it directly under its own introduction, above this, so that the first
 * thing read is what the agreement is for.
 */
export default function AgreementDocument() {
  return (
    <div className="portal-doc">
      {AGREEMENT_SECTIONS.map((section) => (
        <section key={section.number} className="portal-doc-section">
          <h3 className="portal-doc-heading">
            {section.number}. {section.heading}
          </h3>

          <div className="portal-clauses">
            {section.clauses.map((clause, index) => (
              <Clause key={clause.number ?? index} clause={clause} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * One clause. A numbered clause hangs its number in the left column so the
 * clause text keeps a single left edge down the section; the unnumbered lead-in
 * to a section has no number to hang, and takes the full width.
 *
 * A clause can run to more than one paragraph — 2.1 does — and only the first
 * carries the number.
 */
function Clause({ clause }: { clause: AgreementClause }) {
  const paragraphs = clauseParagraphs(clause);

  return (
    <div
      className={`portal-clause${clause.number ? "" : " portal-clause--plain"}`}
    >
      {clause.number && (
        <span className="portal-clause-number">{clause.number}</span>
      )}

      <div className="portal-clause-body">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
