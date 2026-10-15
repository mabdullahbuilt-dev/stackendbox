import {it,expect} from "vitest";
import {accountLandingPath} from "@/lib/portal/account-navigation";
it("sends staff activation and password login to account security for MFA",()=>expect(accountLandingPath("staff")).toBe("/client-portal/settings"));
it("preserves the existing client and owner landing paths",()=>{for(const role of ["client","super_admin"])expect(accountLandingPath(role)).toBe("/client-portal/dashboard");});
