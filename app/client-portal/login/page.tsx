import { Portal } from "@/components/portal/Portal";

// Public form only. Authentication remains in the uncached, server-side API.
export const dynamic = "force-static";
export default function LoginPage() {
  return <Portal path={["login"]} />;
}
