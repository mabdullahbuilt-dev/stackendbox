import type { Metadata } from "next";
import "@/styles/portal.css";
export const metadata: Metadata = {
  title: "Client Portal | StackEndBox",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="portal-root">{children}</div>;
}
