import {it,expect} from "vitest";
import {accountLandingPath,verifiedMfaLandingPath} from "@/lib/portal/account-navigation";
it.each(["staff","super_admin"])("sends %s activation and password login to administrator MFA",role=>expect(accountLandingPath(role)).toBe("/admin/verify"));
it("preserves the client landing path",()=>expect(accountLandingPath("client")).toBe("/client-portal/dashboard"));
it.each(["staff","super_admin"])("opens the %s workspace after verified MFA",role=>expect(verifiedMfaLandingPath(role)).toBe("/admin"));
it.each(["client","unknown"])("does not grant an administrative destination to %s",role=>expect(verifiedMfaLandingPath(role)).toBeNull());
