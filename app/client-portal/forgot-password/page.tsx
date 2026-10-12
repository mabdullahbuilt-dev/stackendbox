import { Portal } from "@/components/portal/Portal";

// Contains no account data or recovery token. Email callbacks stay uncached.
export const dynamic = "force-static";
export default function RecoveryPage() {
  return <Portal path={["forgot-password"]} />;
}
