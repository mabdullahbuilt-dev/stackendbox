import type { Metadata } from "next";
import "@/styles/portal.css";
import { PortalCache } from "@/components/portal/PortalCache";
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
  return <div className="portal-root"><PortalCache>{children}</PortalCache></div>;
}
