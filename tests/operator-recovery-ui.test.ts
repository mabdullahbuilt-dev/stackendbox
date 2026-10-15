import {readFileSync} from "node:fs";
import {it,expect} from "vitest";
it("keeps notification recovery explicit and bound to the selected item without a native dialog",()=>{
 const source=readFileSync("components/portal/AdminOperations.tsx","utf8");
 expect(source).not.toContain("window.confirm");
 for(const text of ['recoveryConfirmation===detail.item.id','Confirm queue once','Cancel recovery','confirmed:true','setRecoveryConfirmation(null)'])expect(source).toContain(text);
});
it("doesn't offer a retry label for completed customer provisioning",()=>{
 const source=readFileSync("components/portal/AdminClients.tsx","utf8");
 expect(source).toMatch(/finished\s*\? "Client created"\s*: attempt\s*\? "Retry same request"/);
});
