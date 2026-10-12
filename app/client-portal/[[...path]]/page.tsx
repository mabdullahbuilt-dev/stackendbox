import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { identity } from "@/lib/portal/server";
import { PortalError } from "@/lib/portal/rules";
import {PrivateClientPortal} from "@/components/portal/PrivatePortal";
export const dynamic = "force-dynamic";
export default async function PortalPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  if (!path.length) redirect("/client-portal/dashboard");
  if (path[0] === "admin") redirect("/admin");
  if (path[0] === "domains" && path[1] === "buy") notFound();
  const allowed = [
    "login",
    "forgot-password",
    "reset-password",
    "dashboard",
    "domains",
    "websites",
    "billing",
    "renewals",
    "requests",
    "documents",
    "settings",
  ];
  if (!allowed.includes(path[0])) notFound();
  if (["login", "forgot-password"].includes(path[0])) {
    const {Portal}=await import("@/components/portal/Portal");
    return <Portal path={path} />;
  }
  let userId = "";
  let passwordChangeRequired = false;
  try {
    const auth = await identity();
    passwordChangeRequired = auth.user.app_metadata?.portal_password_change_required === true;
    userId = auth.user.id;
  } catch (e) {
    if (e instanceof PortalError && e.status === 401)
      redirect("/client-portal/login");
    return (
      <main id="main" className="portal-auth">
        <Link href="/">StackEndBox</Link>
        <h1>Portal access unavailable</h1>
        <p>
          {e instanceof PortalError && e.status === 403
            ? "This account has not been approved or its access has been revoked. Contact StackEndBox."
            : "The portal is being configured. Please try again shortly."}
        </p>
        <Link href="/client-portal/login">Return to sign in</Link>
      </main>
    );
  }
  if (passwordChangeRequired && path[0] !== "reset-password") redirect("/client-portal/reset-password");
  return <PrivateClientPortal key={userId} path={path} userId={userId} />;
}
