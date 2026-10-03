import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });
const p = await ctx.newPage(); await p.goto("http://localhost:3100",{waitUntil:"networkidle"});
const total = await p.evaluate(()=>document.documentElement.scrollHeight);
for (let y=0;y<total;y+=400){ await p.evaluate(y=>scrollTo(0,y),y); await p.waitForTimeout(60);
 const o=await p.evaluate(()=>{const vw=document.documentElement.clientWidth;if(document.documentElement.scrollWidth<=vw)return null;return [...document.querySelectorAll("body *")].filter(e=>e.getBoundingClientRect().right>vw+1).slice(0,5).map(e=>e.className?.toString().slice(0,50)+"|"+e.tagName)}); if(o) console.log(y,o);}
await b.close();
