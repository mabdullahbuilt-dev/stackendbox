import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { identity } from "@/lib/portal/server";
import { PortalError } from "@/lib/portal/rules";
import { Portal } from "@/components/portal/Portal";
export const dynamic = "force-dynamic";
export default async function PortalPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  if (!path.length) redirect("/client-portal/dashboard");
  if (path[0] === "admin") redirect("/admin");
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
  if (["login", "forgot-password"].includes(path[0]))
    return <Portal path={path} />;
  let userId = "";
  try {
    const auth = await identity();
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
  return <Portal key={userId} path={path} userId={userId} />;
}
