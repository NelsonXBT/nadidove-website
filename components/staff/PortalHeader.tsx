import Link from "next/link";

/**
 * The portal's own masthead.
 *
 * `SiteChrome` hides the marketing header and footer across `/staff`, so this
 * stands in for them: the wordmark, what this area is, and a way back to the
 * public site. Every portal screen uses it, which is what keeps the wordmark in
 * the same place as the applicant moves through the flow.
 */
export default function PortalHeader({
  subtitle = "Staff Registration",
}: {
  subtitle?: string;
}) {
  return (
    <header className="flex items-start justify-between gap-6 border-b border-neutral-900 pb-8">
      <div>
        <Link
          href="/"
          className="text-xl font-semibold tracking-[0.25em] transition hover:text-neutral-400"
        >
          NADIDOVE
        </Link>

        <p className="mt-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
          {subtitle}
        </p>
      </div>

      <Link
        href="/"
        className="shrink-0 pt-1 text-xs uppercase tracking-[0.15em] text-neutral-600 transition hover:text-white"
      >
        ← Nadidove.com
      </Link>
    </header>
  );
}
