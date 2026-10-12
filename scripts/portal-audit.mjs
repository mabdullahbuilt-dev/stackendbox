import { loadEnvFile } from 'node:process';
import { createClient } from '@supabase/supabase-js';
loadEnvFile('.env.portal.local');
const required=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','SPACESHIP_API_KEY','SPACESHIP_API_SECRET','WHOP_SANDBOX_API_KEY','WHOP_SANDBOX_COMPANY_ID','BREVO_CLIENT_API_KEY','TURNSTILE_SECRET_KEY'];
console.log(JSON.stringify({configuration:required.map(name=>({name,present:Boolean(process.env[name]),length:process.env[name]?.length,placeholder:/redact|sensitive|encrypted|hidden/i.test(process.env[name]||'')}))}));
async function check(name,url,headers,project) {
  try {
    const r=await fetch(url,{headers,signal:AbortSignal.timeout(20000)});
    const data=await r.json();
    console.log(JSON.stringify({provider:name,status:r.status,...(r.ok?project(data):{})}));
    return r.ok?data:null;
  } catch {console.log(JSON.stringify({provider:name,error:'network_or_schema_failure'}));return null;}
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
const {data,error}=await db.auth.admin.listUsers({perPage:1});
console.log(JSON.stringify({provider:'supabase_auth',connected:!error,userCount:data?.total??null,error:error?.status}));
const headers={'X-API-Key':process.env.SPACESHIP_API_KEY,'X-API-Secret':process.env.SPACESHIP_API_SECRET};
const inventory=await check('spaceship_inventory','https://spaceship.dev/api/v1/domains?take=100&skip=0',headers,d=>({count:d.total,domains:d.items?.map(x=>({name:x.name,autoRenew:x.autoRenew,expirationDate:x.expirationDate,lifecycleStatus:x.lifecycleStatus}))}));
if(inventory?.items?.[0]) await check('spaceship_detail',`https://spaceship.dev/api/v1/domains/${inventory.items[0].name}`,headers,d=>({name:d.name,autoRenew:d.autoRenew,expirationDate:d.expirationDate,nameservers:d.nameservers}));
await check('whop_products',`https://sandbox-api.whop.com/api/v1/products?company_id=${process.env.WHOP_SANDBOX_COMPANY_ID}`,{Authorization:`Bearer ${process.env.WHOP_SANDBOX_API_KEY}`},d=>({keys:Object.keys(d),products:d.data?.map(x=>({id:x.id,title:x.title}))}));
await check('brevo_account','https://api.brevo.com/v3/account',{'api-key':process.env.BREVO_CLIENT_API_KEY},d=>({smtpEnabled:d.smtp?.relay?.enabled??null}));
