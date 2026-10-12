import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { superAdmin } from "@/lib/portal/server";
import { PortalError } from "@/lib/portal/rules";
import {PrivateAdminPortal} from "@/components/portal/PrivatePortal";
export const dynamic = "force-dynamic";
export default async function AdminPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  const section = path[0] || "operations";
  if (
    (path.length > 1 &&
      !(
        path.length === 2 &&
        ((section === "clients" && path[1] === "new") || section === "domains")
      )) ||
    ![
      "operations",
      "domains",
      "clients",
      "health",
      "support",
      "billing",
      "security",
    ].includes(section)
  )
    notFound();
  try {
    await superAdmin();
  } catch (error) {
    if (error instanceof PortalError && error.status === 401)
      redirect("/client-portal/login");
    if (
      error instanceof PortalError &&
      error.code === "administrator_mfa_required"
    ) {
      return (
        <main className="portal-auth">
          <h1>Verify your authenticator</h1>
          <p>Administrator access requires a verified MFA session.</p>
          <Link className="portal-button" href="/client-portal/settings">
            Open account security
          </Link>
        </main>
      );
    }
    if (error instanceof PortalError && error.status === 403) notFound();
    throw error;
  }
  return (
    <PrivateAdminPortal
      section={section}
      createClient={section === "clients" && path[1] === "new"}
      domain={section === "domains" ? path[1] : undefined}
    />
  );
}
