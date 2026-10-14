import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {expect,it} from "vitest";
import {renewalWindow,customerMoney} from "@/lib/portal/renewal-view";
import {ClientDomainCards} from "@/components/portal/ClientDomainCards";
it("uses distinct expiry windows and never invents unknown dates",()=>{
 const now=Date.parse("2026-10-14T00:00:00Z");
 for(const [days,bucket] of [[0,"Expired"],[1,"1–7 days"],[7,"1–7 days"],[8,"8–14 days"],[14,"8–14 days"],[15,"15–30 days"],[30,"15–30 days"],[31,"31–60 days"],[60,"31–60 days"],[61,"More than 60 days"]] as const){
   expect(renewalWindow(new Date(now+days*86400000).toISOString(),now)).toEqual({days,bucket});
 }
 expect(renewalWindow(null,now)).toEqual({days:null,bucket:"Expiry unverified"});
 expect(renewalWindow("invalid",now).days).toBeNull();
});
it("doesn't fabricate a price when amount or currency is invalid",()=>{
 expect(customerMoney(undefined,"USD")).toBe("Quote required");
 expect(customerMoney(-1,"USD")).toBe("Quote required");
 expect(customerMoney(1.5,"USD")).toBe("Quote required");
 expect(customerMoney(1300,"bad-currency")).toBe("Quote required");
 expect(customerMoney(1300,"USD")).toBe("$13.00");
});
it("shows expired status, unknown auto-renew and one meaningful domain action",()=>{
 const html=renderToStaticMarkup(createElement(ClientDomainCards,{domains:[{id:"fixture",name:"fixture.invalid",lifecycle_status:"registered",expiration_date:"2000-01-01T00:00:00Z",auto_renew:null}],quotes:[]}));
 expect(html).toContain("Expired");expect(html).not.toContain(">Active<");
 expect(html).toContain("Not verified");expect(html).toContain("Quote required");
 expect(html.match(/Manage Domain/g)).toHaveLength(1);
 expect(html).not.toContain("checkout");
});
