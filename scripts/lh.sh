#!/bin/bash
# usage: scripts/lh.sh desktop|mobile  -> prints scores
export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
f=$1; X=""; [ $f = desktop ] && X="--preset=desktop"
npx lighthouse@12 http://localhost:3100 $X --chrome-flags="--no-sandbox --headless" --only-categories=performance,accessibility --output=json --output-path=/tmp/lh-$f.json --quiet >/dev/null 2>&1
node -e "const r=require('/tmp/lh-$f.json');const a=r.audits;console.log('$f perf',Math.round(r.categories.performance.score*100),'a11y',Math.round(r.categories.accessibility.score*100),'FCP',a['first-contentful-paint'].displayValue,'LCP',a['largest-contentful-paint'].displayValue,'TBT',a['total-blocking-time'].displayValue,'CLS',a['cumulative-layout-shift'].displayValue,'SI',a['speed-index'].displayValue)"
