import { build } from 'esbuild';
import { mkdir, writeFile, cp, stat, readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { materializePublicAssets } from './cloudflare-public-assets.ts';

const root = process.cwd();
const productionBuild = process.argv.includes('--production');
const runtime = resolve(root, 'platform/edge/next-runtime.ts');
const navigation = resolve(root, 'platform/static/navigation.tsx');
const localConfiguration = process.env.PORTAL_PRIVATE_ENV ? parseEnv(await readFile(process.env.PORTAL_PRIVATE_ENV,'utf8')) : {};
const publicConfiguration = Object.fromEntries(['NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_COMPANY_EMAIL','NEXT_PUBLIC_CAL_URL','NEXT_PUBLIC_CONTACT_PHONE','NEXT_PUBLIC_WHATSAPP_URL','NEXT_PUBLIC_GITHUB_URL','NEXT_PUBLIC_LINKEDIN_URL','NEXT_PUBLIC_X_URL','NEXT_PUBLIC_ANALYTICS_ENDPOINT','NEXT_PUBLIC_TURNSTILE_SITE_KEY'].map(name=>[name,process.env[name]||localConfiguration[name]]).filter(([,value])=>value));
const publicSiteKey = publicConfiguration.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const edgeAliases = { name: 'edge-boundary', setup(b) {
  b.onResolve({ filter: /^next\/(server|headers)$/ }, () => ({ path: runtime }));
  b.onResolve({ filter: /^server-only$/ }, () => ({ path: 'empty', namespace: 'empty' }));
  b.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: 'export {}' }));
} };
await mkdir('dist/edge', { recursive: true });
const edgeBuild = await build({ entryPoints: ['platform/edge/handler.ts'], outfile: 'dist/edge/handler.mjs', bundle: true, platform: 'node', format: 'esm', target: 'es2022', minify: true, metafile:true, plugins: [edgeAliases], define: { 'process.env': 'globalThis.STACKENDBOX_RUNTIME_ENV' }, banner: { js: 'import process from "node:process"; import {Buffer} from "node:buffer"; globalThis.STACKENDBOX_RUNTIME_ENV ??= process.env;' } });
const excluded = Object.keys(edgeBuild.metafile.inputs).filter(p => /node_modules\/(?:vinext|@vinext|braces|satori|@vercel\/og)\//.test(p));
if (excluded.length) throw Error('Unexpected framework dependency in Edge runtime');
await writeFile('dist/edge/dependency-evidence.json', JSON.stringify({ forbiddenFrameworkInputs:excluded, inputs:Object.keys(edgeBuild.metafile.inputs) },null,2));
// Configuration is read inside the Edge runtime, never compiled into a bundle.
await cp('platform/edge/configuration.ts', 'dist/edge/configuration.ts');
await writeFile('dist/edge/index.ts', `import {${productionBuild?'productionConfiguration':'acceptanceConfiguration'}} from "./configuration.ts";
const config = JSON.parse(Deno.env.get("${productionBuild?'STACKENDBOX_PRODUCTION_CONFIG':'STACKENDBOX_ACCEPTANCE_CONFIG'}") || "{}");
globalThis.STACKENDBOX_RUNTIME_ENV = ${productionBuild?'productionConfiguration':'acceptanceConfiguration'}(config, name => Deno.env.get(name));
const {handleEdge} = await import("./handler.mjs");
Deno.serve(req => handleEdge(req, p => EdgeRuntime.waitUntil(p)));
`);
const frontendAliases = { name: 'static-navigation', setup(b) {
  b.onResolve({ filter: /^\// }, a => a.kind === 'url-token' ? { path:a.path, external:true } : null);
  b.onResolve({ filter: /^next\/(link|image|navigation)$/ }, a => ({ path: a.path, namespace: 'static-next' }));
  b.onLoad({ filter: /.*/, namespace: 'static-next' }, a => ({ contents: a.path === 'next/link' ? `export {Link as default} from ${JSON.stringify(navigation)}` : a.path === 'next/image' ? `export {Image as default} from ${JSON.stringify(navigation)}` : `export {useRouter,useSearchParams} from ${JSON.stringify(navigation)}`, resolveDir: root }));
  b.onLoad({ filter: /content[\\/]projects\.ts$/ }, async a => ({ contents: materializePublicAssets(await readFile(a.path,'utf8'),a.path,root), loader:'ts' }));
} };
await mkdir('dist/static', { recursive: true });
await cp('public', 'dist/static', { recursive: true });
await mkdir('dist/static/fonts', { recursive: true });
await cp('node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2','dist/static/fonts/geist.woff2');
await cp('node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2','dist/static/fonts/geist-mono.woff2');
await build({ entryPoints: ['platform/static/portal.tsx'], outfile: 'dist/static/portal.js', bundle: true, platform: 'browser', format: 'esm', target: 'es2022', minify: true, plugins: [frontendAliases], define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY': JSON.stringify(publicSiteKey) } });
await writeFile('dist/static/portal.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>StackEndBox Portal</title><link rel="stylesheet" href="/portal.css"></head><body><div id="root"></div><script type="module" src="/portal.js"></script></body></html>');
await writeFile('dist/static/_redirects', '/ /index.html 200\n/admin /portal.html 200\n/admin/* /portal.html 200\n/client-portal /portal.html 200\n/client-portal/* /portal.html 200\n');
await writeFile('dist/static/_headers', '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n/portal.html\n  Cache-Control: no-cache\n');
const publicDefines = { 'process.env':JSON.stringify(publicConfiguration), 'process.env.NODE_ENV':'"production"', 'process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY':JSON.stringify(publicSiteKey) };
await build({ entryPoints:['platform/static/site-browser.tsx'], outfile:'dist/static/site.js', bundle:true, platform:'browser', format:'esm', target:'es2022', minify:true, plugins:[frontendAliases], define:publicDefines });
await build({ stdin:{ contents:'import React from "react"; import {renderToString} from "react-dom/server"; import {StaticSite} from "./platform/static/site"; import {copy} from "./content/copy"; export const markup=renderToString(React.createElement(StaticSite)); export const title=copy.meta.title; export const description=copy.meta.description;', resolveDir:root, loader:'tsx' }, outfile:'dist/site-render.mjs', bundle:true, platform:'node', format:'esm', packages:'external', plugins:[frontendAliases], loader:{'.css':'empty'}, define:publicDefines });
const rendered = await import(pathToFileURL(resolve('dist/site-render.mjs')).href);
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
await writeFile('dist/static/index.html', `<!doctype html><html lang="en" data-motion="full"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(rendered.title)}</title><meta name="description" content="${escape(rendered.description)}"><link rel="canonical" href="https://www.stackendbox.com/"><link rel="stylesheet" href="/site.css"></head><body><noscript><style>.reveal{opacity:1!important;transform:none!important}</style></noscript><a href="#main" class="skip-link">Skip to content</a><div id="root">${rendered.markup}</div><script type="module" src="/site.js"></script></body></html>`);
// Retain the existing Next-generated public artifacts instead of rebuilding
// images or running a metadata renderer in the Free Worker at request time.
for (const name of ['icon.png','apple-icon.png','opengraph-image','twitter-image','sitemap.xml'])
  await cp(`.next/server/app/${name}.body`,`dist/static/${name}`);
await writeFile('dist/static/robots.txt', productionBuild ? await readFile('.next/server/app/robots.txt.body','utf8') : 'User-agent: *\nDisallow: /\n');
await writeFile('dist/static/_headers', `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n${productionBuild?'':'  X-Robots-Tag: noindex, nofollow\n'}/portal.html\n  Cache-Control: no-cache\n/opengraph-image\n  Content-Type: image/png\n/twitter-image\n  Content-Type: image/png\n`);
console.log(JSON.stringify({ edgeBundleBytes: (await stat('dist/edge/handler.mjs')).size, portalBundleBytes: (await stat('dist/static/portal.js')).size, scope: 'isolated portal proof, existing public site untouched' }));
