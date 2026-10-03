import { chromium } from "playwright-core";
const [w,h,out]=process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"] });
const ctx = await b.newContext({ viewport:{width:+w,height:+h}, hasTouch:+w<700, isMobile:+w<700 });
const p = await ctx.newPage();
await p.goto("http://localhost:3100",{waitUntil:"networkidle"});
await p.addStyleTag({content:"html{scroll-behavior:auto!important}"});
const t=await p.evaluate(()=>document.documentElement.scrollHeight);
for(let y=0;y<t;y+=500){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(40);}
await p.evaluate(()=>{const e=document.getElementById("process");scrollTo(0,scrollY+e.getBoundingClientRect().top-40)});
for (const [i,ms] of [[0,300],[1,1800],[2,1500],[3,1700],[4,2500]]) { await p.waitForTimeout(ms); await p.screenshot({path:`${out}-${i}.png`}); }
await b.close();
