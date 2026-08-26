import {
  AGREEMENT_SECTIONS,
  type AgreementClause,
} from "@/lib/staff/agreement";

/**
 * The agreement, rendered from its structured source.
 *
 * `lib/staff/agreement.ts` holds the wording transcribed from
 * `Nadidove_Films_Individual_Team_Agreement_Updated.pdf`, clause by clause. It
 * is rendered from that structure rather than from the flat `content` string on
 * the `agreements` row, so numbered clauses hang correctly and the Phase 1
 * salary bands stay a table instead of collapsing into a run of text.
 *
 * The row still carries the same wording — `agreementPlainText()` derives it
 * from this module — so what a person reads here is what their acceptance
 * record points at.
 */
export default function AgreementDocument() {
  return (
    <div className="text-[15px] leading-8 text-neutral-300">
      {AGREEMENT_SECTIONS.map((section) => (
        <section key={section.number} className="mt-12 first:mt-0">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
            {section.number}. {section.heading}
          </h3>

          <div className="mt-5 space-y-5">
            {section.clauses.map((clause, index) => (
              <Clause key={clause.number ?? index} clause={clause} />
            ))}
          </div>

          {section.table && (
            <div className="mt-7 overflow-x-auto">
              <table className="w-full min-w-[22rem] border-collapse text-left text-sm">
                <thead>
                  <tr>
                    {section.table.columns.map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="border border-neutral-800 bg-neutral-900 px-4 py-3 font-medium text-neutral-200"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {section.table.rows.map(([revenue, salary]) => (
                    <tr key={revenue}>
                      <td className="border border-neutral-800 px-4 py-3 text-neutral-300">
                        {revenue}
                      </td>

                      <td className="border border-neutral-800 px-4 py-3 text-neutral-300">
                        {salary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {section.clausesAfterTable && (
            <div className="mt-7 space-y-5">
              {section.clausesAfterTable.map((clause, index) => (
                <Clause key={clause.number ?? index} clause={clause} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

/**
 * One clause. A numbered clause hangs its number in the left margin so the
 * clause text stays aligned down the section; the unnumbered lead-in to the
 * salary table has no number to hang.
 */
function Clause({ clause }: { clause: AgreementClause }) {
  if (!clause.number) {
    return <p>{clause.text}</p>;
  }

  return (
    <p className="flex gap-4">
      <span className="w-9 shrink-0 tabular-nums text-neutral-500">
        {clause.number}
      </span>

      <span>{clause.text}</span>
    </p>
  );
}
