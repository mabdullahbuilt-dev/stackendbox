import type { Metadata } from "next";
import "@/styles/portal.css";
import "@/styles/portal-design.css";
export const metadata: Metadata = { title: "Administration | StackEndBox", robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="portal-root">{children}</div>;
}
