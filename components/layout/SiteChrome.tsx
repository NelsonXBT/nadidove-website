"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the marketing header and footer on the staff portal.
 *
 * The portal is a private tool with its own chrome, and the site navigation
 * would otherwise put a second Nadidove logo and links to Films/About/Contact
 * on top of a registration form.
 *
 * The header and footer stay server components — they are passed through as
 * children rather than imported here, so nothing about them moves to the
 * client just to answer this question.
 */
export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname?.startsWith("/staff")) {
    return null;
  }

  return <>{children}</>;
}
