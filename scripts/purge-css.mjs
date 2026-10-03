// Removes CSS rules whose selectors only target classes that no longer appear in source. node scripts/purge-css.mjs [--write]
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
const write = process.argv.includes("--write");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (["node_modules", ".next", ".git", ".qa"].includes(e.name) ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
const src = ["app", "components", "content", "lib"].flatMap(walk).filter((f) => /\.(tsx?|mdx?)$/.test(f)).map((f) => fs.readFileSync(f, "utf8")).join("\n");
const live = (cls) => {
  if (src.includes(cls)) return true;
  // dynamic fragments: sp-tile--${i}, tone-${x}
  const parts = cls.split(/--|__/);
  for (let n = parts.length - 1; n >= 1; n--) { const pre = cls.slice(0, cls.length - parts.slice(n).join("--").length - 2); if (pre.length > 3 && src.includes(pre + "--") && /\$\{/.test(src.slice(src.indexOf(pre + "--"), src.indexOf(pre + "--") + 40))) return true; }
  return /^(sr-only|is-|js-|data-)/.test(cls);
};
let removed = 0, kept = 0; const names = [];
for (const f of fs.readdirSync("styles").filter((x) => x.endsWith(".css"))) {
  const p = path.join("styles", f);
  const root = postcss.parse(fs.readFileSync(p, "utf8"));
  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
    const sels = rule.selectors;
    const dead = sels.every((s) => { const cls = [...s.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]); return cls.length > 0 && cls.some((c) => !live(c)); });
    if (dead) { removed++; names.push(sels[0].slice(0, 60)); rule.remove(); } else kept++;
  });
  root.walkAtRules((a) => { if (["media", "supports"].includes(a.name) && a.nodes && a.nodes.length === 0) a.remove(); });
  if (write) fs.writeFileSync(p, root.toString());
}
console.log({ removed, kept });
if (!write) console.log(names.slice(0, 400).join("\n"));
