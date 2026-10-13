import {build} from 'esbuild';
import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=process.cwd(),output='dist/portals-only',navigation=resolve('platform/static/navigation.tsx');
const siteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
if(!siteKey||/placeholder|redacted/i.test(siteKey))throw Error('verified_public_turnstile_site_key_required');
await mkdir(`${output}/fonts`,{recursive:true});
const aliases={name:'portal-only-adapters',setup(b){
  b.onResolve({filter:/^\//},a=>a.kind==='url-token'?{path:a.path,external:true}:null);
  b.onResolve({filter:/^next\/(link|image|navigation)$/},a=>({path:a.path,namespace:'portal-next'}));
  b.onLoad({filter:/.*/,namespace:'portal-next'},a=>({contents:a.path==='next/link'?`export {Link as default} from ${JSON.stringify(navigation)}`:a.path==='next/image'?`export {Image as default} from ${JSON.stringify(navigation)}`:`export {useRouter,useSearchParams} from ${JSON.stringify(navigation)}`,resolveDir:root}));
  b.onLoad({filter:/platform[\\/]static[\\/]fonts\.css$/},async a=>({contents:(await readFile(a.path,'utf8')).replaceAll('/fonts/','/client-portal/_assets/fonts/'),loader:'css',resolveDir:root}));
}};
await build({entryPoints:['platform/static/portal.tsx'],outfile:`${output}/portal.js`,bundle:true,platform:'browser',format:'esm',target:'es2022',minify:true,plugins:[aliases],define:{'process.env':'{}','process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY':JSON.stringify(siteKey),'process.env.NEXT_PUBLIC_PORTAL_API_BASE':'"/client-portal/api"'}});
await cp('node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2',`${output}/fonts/geist.woff2`);
await cp('node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2',`${output}/fonts/geist-mono.woff2`);
await writeFile(`${output}/portal.html`,'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>StackEndBox Portal</title><link rel="stylesheet" href="/client-portal/_assets/portal.css"></head><body><div id="root"></div><script type="module" src="/client-portal/_assets/portal.js"></script></body></html>');
console.log(JSON.stringify({output,homepageBuilt:false,publicAssetsCopied:false,publicApiRoutesIncluded:false}));
