import {it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {staffRoles,rolePermissions,routePermission} from "@/lib/portal/permissions";
const allowed={operations_admin:"admin/services",domain_manager:"admin/activate-domain-client",billing_manager:"admin/invoices",support_staff:"admin/request-status",auditor:"admin/operations"};
const denied={operations_admin:"admin/team/change",domain_manager:"admin/invoices",billing_manager:"admin/request-status",support_staff:"admin/import-domain",auditor:"admin/invoices"};
for(const role of staffRoles){
 it(`${role} has an explicit allowed business capability`,()=>expect(rolePermissions[role] as readonly string[]).toContain(routePermission(allowed[role],role==="auditor"?"GET":"POST")));
 it(`${role} cannot use its denied operation`,()=>expect(rolePermissions[role] as readonly string[]).not.toContain(routePermission(denied[role],"POST")));
 it(`${role} matches the database permission matrix exactly`,()=>{
  const sql=readFileSync("supabase/migrations/202610150001_staff_permissions.sql","utf8"),match=sql.match(new RegExp(`\\('${role}',array\\[([^\\]]+)\\]\\)`));
  expect(match).not.toBeNull();expect(match![1].match(/'([^']+)'/g)?.map(v=>v.slice(1,-1))).toEqual(rolePermissions[role]);
 });
}
it("unknown, destructive, secret/diagnostic and registrar-write routes are owner-only",()=>{
 for(const route of ["admin/settings","admin/data","admin/jobs","admin/team/invite","admin/domains/example.com/dns-acceptance","admin/unknown","domains/example.com/manage"])
  expect(routePermission(route,"POST")).toBe("owner");
});
it("doesn't allow the support role to read billing, or an auditor to write",()=>{
 expect(rolePermissions.support_staff as readonly string[]).not.toContain("billing.read");
 expect(rolePermissions.auditor.every(p=>p.endsWith(".read"))).toBe(true);
  for(const route of ["admin/import-domain","admin/sync","admin/activate-domain-client","admin/services","admin/request-status","admin/invoices"])
    expect(rolePermissions.auditor as readonly string[]).not.toContain(routePermission(route,"POST"));
});
