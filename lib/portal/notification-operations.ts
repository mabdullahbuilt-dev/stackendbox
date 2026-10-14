import "server-only";
import {z} from "zod";
import {adminDb,audit,checkDb,env,rateLimit} from "./server";
import {PortalError} from "./rules";

const eventSchema=z.object({messageId:z.string(),email:z.email(),event:z.string(),date:z.string().refine(value=>Number.isFinite(Date.parse(value)))});
export function notificationEvidence(raw:unknown,messageId:string,recipient:string){
  const parsed=z.object({events:z.array(eventSchema).max(100).default([])}).parse(raw);
  const states:Record<string,string>={delivered:"delivered",hardBounces:"bounced",softBounces:"deferred",blocked:"failed",error:"failed",invalid:"failed",deferred:"deferred",requests:"accepted",sent:"accepted"};
  const matches=parsed.events.filter(event=>event.messageId===messageId&&event.email.toLowerCase()===recipient.toLowerCase()&&states[event.event]).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
  const latest=matches[0];
  return latest?{status:states[latest.event],event:latest.event,event_at:new Date(latest.date).toISOString()}:null;
}

export async function reconcileNotification(actor:string,raw:unknown){
  const {id}=z.object({id:z.uuid()}).strict().parse(raw),db=adminDb();
  await rateLimit(`notification-status:${id}`,3,300);
  const saved=await db.from("portal_email_outbox").select("id,recipient,provider_id,status").eq("id",id).maybeSingle();checkDb(saved.error);
  if(!saved.data)throw new PortalError("notification_not_found",404);
  if(!saved.data.provider_id)throw new PortalError("notification_reference_missing_no_resend",409);
  const query=new URLSearchParams({messageId:saved.data.provider_id,days:"90",limit:"100",sort:"desc"});
  let response:Response;
  try{response=await fetch(`https://api.brevo.com/v3/smtp/statistics/events?${query}`,{headers:{"api-key":env("BREVO_CLIENT_API_KEY")},signal:AbortSignal.timeout(10000)});}catch{throw new PortalError("notification_provider_unavailable",503);}
  if(!response.ok)throw new PortalError(response.status===429?"notification_status_rate_limited":"notification_provider_unavailable",response.status===429?429:503);
  let evidence:ReturnType<typeof notificationEvidence>;
  try{evidence=notificationEvidence(await response.json(),saved.data.provider_id,saved.data.recipient);}catch{throw new PortalError("notification_provider_unavailable",503);}
  if(!evidence)return {message:"No matching delivery event is available. Existing status is preserved. Nothing was resent.",status:saved.data.status};
  // An accepted/sent event must never downgrade a previously proven delivery.
  if(saved.data.status!=="delivered"||evidence.status!=="accepted"){
    checkDb((await db.from("portal_email_outbox").update({status:evidence.status}).eq("id",id).eq("provider_id",saved.data.provider_id).eq("status",saved.data.status)).error);
  }
  await audit(actor,"notification_delivery_reconciled",id,evidence);
  return {message:`Provider evidence: ${evidence.status}. Nothing was resent.`,...evidence};
}

export async function recoverUnsentNotification(actor:string,raw:unknown){
  const {id,confirmed}=z.object({id:z.uuid(),confirmed:z.literal(true)}).strict().parse(raw);void confirmed;
  const result=await adminDb().rpc("portal_recover_predispatch_emails",{target_ids:[id]});checkDb(result.error);
  if(result.data!==1)throw new PortalError("notification_recovery_not_safe",409);
  await audit(actor,"notification_recovery_requested",id,{sent:false,evidence:"verified_missing_sender_before_dispatch"});
  return {message:"Confirmed unsent notification queued once. No email was sent by this action."};
}
