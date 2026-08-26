import type { Metadata } from "next";

/**
 * The portal is a private tool, not part of the public site: it holds banking
 * details and identity documents, so it is kept out of search results and out
 * of the site's own metadata templates.
 */
export const metadata: Metadata = {
  title: "Staff Registration — Nadidove",
  robots: { index: false, follow: false, nocache: true },
};

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
