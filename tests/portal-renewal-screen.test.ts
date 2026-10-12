import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it,vi} from "vitest";
vi.mock("next/navigation",()=>({useSearchParams:()=>new URLSearchParams(),useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock("@/components/portal/PortalCache",()=>({usePortalCache:()=>({save:vi.fn()})}));
vi.mock("react",async importOriginal=>{
  const react=await importOriginal<typeof import("react")>();
  return {...react,useState:(initial:unknown)=>initial==="Overview"?["Renewal & Billing",vi.fn()]:react.useState(initial)};
});
import {PortalContent,type Data} from "@/components/portal/Portal";
function render(enabled:boolean,quotes:Record<string,unknown>[]=[]){
 const data:Data={account:{name:"Local fixture",approved_email:"fixture@example.invalid",role:"client",user_id:"user"},factors:[],sandbox_checkout_enabled:enabled,domains:[{id:"domain",name:"fixture.invalid",expiration_date:new Date(Date.now()+86400000).toISOString()}],domain_assignments:[{domain_id:"domain",client_id:"client",holder_arrangement:"client_owned",legal_holder:"Local fixture"}],clients:[],quotes};
 return renderToStaticMarkup(createElement(PortalContent,{section:"domains",path:["domains","fixture.invalid"],data,reload:async()=>{}}));
}
const quote=()=>({id:"quote",domain_id:"domain",domain:"fixture.invalid",kind:"renewal",retail_minor:1300,valid_until:new Date(Date.now()+60000).toISOString()});
describe("renewal capability presentation",()=>{
 it("disables online renewal when no current verified quote exists",()=>{
  const html=render(true);
  expect(html).toContain('disabled="">Online renewal unavailable');
  expect(html).not.toContain("Create sandbox order");
  expect(html).toContain("Contact StackEndBox about renewal");
 });
 it("shows the quote while keeping disabled payment controls clear",()=>{
  const html=render(false,[quote()]);
  expect(html).toContain("$13.00");
  expect(html).toContain("Online payments remain disabled pending acceptance");
  expect(html).not.toContain("Create sandbox order");
 });
 it("requires both a current quote and enabled Sandbox acceptance",()=>{
  expect(render(true,[quote()])).toContain("Create sandbox order");
  expect(render(true,[{...quote(),valid_until:new Date(Date.now()-1000).toISOString()}])).not.toContain("Create sandbox order");
 });
});
