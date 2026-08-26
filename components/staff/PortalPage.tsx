import Container from "@/components/ui/Container";

/**
 * The frame every staff portal screen sits in.
 *
 * The portal runs under the site's own fixed header and footer, so a screen
 * only owns the column between them. That column is held to a reading measure
 * — a form and a legal document are both reading tasks — and the offset for the
 * fixed header comes from `.portal`, which reads `--header-height` rather than
 * guessing at it.
 *
 * `wide` opts the records desk out of the measure: a list of registrations has
 * two columns of its own and is not read line by line.
 */
export default function PortalPage({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <main id="main" className="portal">
      <Container>
        <div className={`portal-inner${wide ? " portal-inner--wide" : ""}`}>
          {children}
        </div>
      </Container>
    </main>
  );
}

/**
 * A screen's opening block: where you are, what this screen is, and what to do
 * with it. Anything that varies — a version line, a notice, an action — is
 * composed after it by the screen itself.
 */
export function PortalHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="portal-head">
      <span className="eyebrow">{eyebrow}</span>

      <h1 className="portal-title">{title}</h1>

      {children}
    </div>
  );
}

/**
 * A titled group of label-and-value rows. The review screen, the completion
 * screen and the records desk all list the same registration back, so they list
 * it the same way — `label` stands in for the section number where a screen is
 * summarising a record rather than walking the form's own four sections.
 */
export function PortalGroup({
  label,
  title,
  children,
}: {
  label?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="portal-block">
      {label && <span className="portal-block-label">{label}</span>}

      <h2 className="portal-block-title">{title}</h2>

      <dl className="portal-rows">{children}</dl>
    </section>
  );
}

/**
 * One row of a `PortalGroup`. An empty value prints an em dash rather than
 * collapsing, so an optional field that was left blank still reads as answered.
 */
export function PortalRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="portal-row">
      <dt>{label}</dt>
      <dd>{value?.trim() || "—"}</dd>
    </div>
  );
}
