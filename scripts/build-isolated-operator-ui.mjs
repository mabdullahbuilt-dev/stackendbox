// Separate fixture build. Never writes candidate or production assets.
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function buildOperatorUi(){
 const output=resolve('dist/isolated-operator'),navigation=resolve('platform/static/navigation.tsx');await mkdir(output,{recursive:true});
 await build({entryPoints:['platform/static/portal.tsx'],outfile:output+'/portal.js',bundle:true,platform:'browser',format:'esm',target:'es2022',define:{'process.env':'{}','process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_PORTAL_API_BASE':'"/client-portal/api"','process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY':'"ISOLATED_PROVIDER_FIXTURE"'},plugins:[{name:'isolated-ui',setup(b){
 b.onResolve({filter:/turnstile-client$/},()=>({path:'verification',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export class PortalVerificationController {verify(){return Promise.resolve("isolated-fixture-verification")}dispose(){}}'}));
 b.onResolve({filter:/^\//},a=>a.kind==='url-token'?{path:a.path,external:true}:null);
 b.onResolve({filter:/^next\/(link|image|navigation)$/},a=>({path:a.path,namespace:'next'}));b.onLoad({filter:/.*/,namespace:'next'},a=>({contents:a.path==='next/link'?`export {Link as default} from ${JSON.stringify(navigation)}`:a.path==='next/image'?`export {Image as default} from ${JSON.stringify(navigation)}`:`export {useRouter,useSearchParams} from ${JSON.stringify(navigation)}`,resolveDir:process.cwd()}));
 }}]});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){await buildOperatorUi();console.log(JSON.stringify({isolatedBrowserBuilt:true,productionArtifactsChanged:false}));}
