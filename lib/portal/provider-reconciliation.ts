import "server-only";
import {adminDb,audit,checkDb,rateLimit} from "./server";
import {spaceship} from "./spaceship";
import {saveVerifiedDomain,notifyClient} from "./services";
import {domainName,PortalError} from "./rules";
export async function reconcileAssignedDomains(clientIds?:string[]){
  const db=adminDb(),claimed=await db.rpc("portal_claim_provider_checks",{client_ids:clientIds||null});checkDb(claimed.error);
  const domains=(claimed.data||[]) as {id:string;name:string;auto_renew:boolean}[];
  if(domains.length>4)throw new PortalError("provider_check_batch_invalid",503);
  const results=await Promise.all(domains.map(async domain=>{
    try{
      await rateLimit(`provider:detail:${domain.name}`,4,300);
      const detail=await spaceship.detail(domain.name);
      if(domainName(detail.name)!==domainName(domain.name))throw new PortalError("registrar_domain_mismatch",502);
      await saveVerifiedDomain(detail);
      checkDb((await db.from("portal_domains").update({provider_checked_at:new Date().toISOString(),next_provider_check_at:new Date(Date.now()+24*60*60*1000).toISOString()}).eq("id",domain.id)).error);
      if(detail.autoRenew){
        const assignment=await db.from("portal_domain_assignments").select("client_id").eq("domain_id",domain.id).single();checkDb(assignment.error);
        if(assignment.data)await notifyClient(assignment.data.client_id,`${domain.name}: registrar auto-renew review`,"Spaceship reports auto-renew enabled. StackEndBox has not changed the setting or charged you. Contact support before starting a manual renewal.",`autorenew-review:${domain.id}:${new Date().toISOString().slice(0,10)}`);
      }
      await audit(null,"provider_domain_reconciled",domain.id,{auto_renew:detail.autoRenew,expiration_verified:!!detail.expirationDate,registrar_mutations:false});return true;
    }catch(error){
      // Preserve all prior verified values and assignments. Failed domains don't
      // monopolize subsequent batches or trigger a registrar mutation.
      checkDb((await db.from("portal_domains").update({reconciliation_required:true,provider_checked_at:new Date().toISOString(),next_provider_check_at:new Date(Date.now()+60*60*1000).toISOString()}).eq("id",domain.id)).error);
      await audit(null,"provider_domain_reconciliation_failed",domain.id,{error:error instanceof PortalError?error.code:"provider_check_failed",prior_snapshot_preserved:true,registrar_mutations:false});return false;
    }
  }));
  return {checked:domains.length,verified:results.filter(Boolean).length,failed:results.filter(value=>!value).length};
}
