import {expect,it} from "vitest";
import {observeLatency,withLatency} from "../lib/portal/latency";
it("isolates parallel request timings without caching authentication",async()=>{
  const a=withLatency(async()=>{await observeLatency("auth_user",async()=>{await new Promise(resolve=>setTimeout(resolve,5));});return new Response("first");});
  const b=withLatency(async()=>{await observeLatency("account",async()=>undefined);return new Response("second");});
  const [one,two]=await Promise.all([a,b]);
  expect(one.headers.get("server-timing")).toContain("auth_user;dur=");
  expect(one.headers.get("server-timing")).not.toContain("account;");
  expect(two.headers.get("server-timing")).toContain("account;dur=");
  expect(two.headers.get("server-timing")).not.toContain("auth_user;");
  expect(await one.text()).toBe("first");
});
