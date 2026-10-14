import {expect,it} from "vitest";
import {backupStatus,healthQueues,type BackupEvidence} from "../lib/portal/health-status";
import {portalPageRoute} from "../lib/portal/page-route";
const now=Date.parse("2026-10-14T12:00:00Z");
const record:BackupEvidence={id:"test",kind:"backup",status:"completed",started_at:"2026-10-14T00:00:00Z",completed_at:"2026-10-14T00:01:00Z",includes_auth:true,includes_objects:true,detail:{offsite:true,checksum_readback_verified:true,objects:0}};
it("requires successful completed offsite readback evidence",()=>{
  expect(backupStatus(record,now).verified).toBe(true);
  for(const change of [{status:"failed"},{kind:"restore_drill"},{completed_at:null},{completed_at:"invalid"},{completed_at:"2030-01-01"},{detail:{offsite:true}},{detail:{checksum_readback_verified:true}}])expect(backupStatus({...record,...change},now).verified).toBe(false);
});
it("distinguishes empty storage inventory from tested file recovery",()=>{
  expect(backupStatus(record,now).storage).toContain("no file payloads");
  expect(backupStatus({...record,detail:{objects:3}},now).storage).toBe("3 file payloads included");
  expect(backupStatus({...record,includes_objects:false},now).storage).toBe("Storage export not included");
});
it("marks only verified generations older than 48 hours as stale",()=>{
  expect(backupStatus(record,now).stale).toBe(false);
  expect(backupStatus({...record,completed_at:"2026-10-12T12:00:00Z"},now).stale).toBe(true);
});
it("routes all follow-up actions to supported admin pages",()=>{
  for(const queue of Object.values(healthQueues))expect(portalPageRoute(queue.href)?.admin).toBe(true);
});
