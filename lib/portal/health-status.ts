export type BackupEvidence = {
  id: string; kind: string; status: string; started_at: string;
  completed_at: string | null; includes_auth: boolean; includes_objects: boolean;
  detail?: {offsite?: boolean; objects?: number; checksum_readback_verified?: boolean};
};

/** Describes recorded evidence only, never infers recovery from an export. */
export function backupStatus(record: BackupEvidence, now = Date.now()) {
  const completed = record.completed_at ? Date.parse(record.completed_at) : NaN;
  const validTime = Number.isFinite(completed) && completed <= now;
  const verified = record.kind === "backup" && record.status === "completed" && validTime &&
    record.detail?.offsite === true && record.detail?.checksum_readback_verified === true;
  const ageHours = validTime ? Math.floor((now - completed) / 3600000) : null;
  return {
    verified, ageHours,
    stale: verified && ageHours !== null && ageHours >= 48,
    label: record.kind === "restore_drill" ? "Recorded recovery drill" : verified ? "Offsite upload and readback verified" : "Offsite integrity not verified by this record",
    storage: !record.includes_objects ? "Storage export not included" : record.detail?.objects === 0 ? "Storage inventory checked, no file payloads existed" : typeof record.detail?.objects === "number" && record.detail.objects > 0 ? `${record.detail.objects} file payloads included` : "Storage payload count unavailable",
  };
}

export const healthQueues = {
  provisioning: {title:"Client setup needs attention",href:"/admin/clients",action:"Open client setup",help:"Review the saved setup request. Resume only that request. If email delivery is uncertain, check delivery records before sending again."},
  email: {title:"Notification delivery needs attention",href:"/admin/operations",action:"Open notification history",help:"Retry status is handled by the scheduled job. A review-required send may already have been delivered, so reconcile it before resending."},
  jobs: {title:"Payment processing jobs",href:"/admin/billing",action:"Open billing",help:"Compare the order and verified payment. A payment alone does not confirm registrar renewal. Never create another checkout to retry a backend job."},
  domain_exceptions: {title:"Domain reconciliation",href:"/admin/domains",action:"Open domain management",help:"Review the last provider state. Auto-renew on or uncertain provider data requires review, not an automatic registrar change."},
  unreconciled_ledger: {title:"Unreconciled financial entries",href:"/admin/billing",action:"Open billing",help:"Match customer settlement and supplier billing separately. Do not mark a renewal complete without confirmed new expiry."},
} as const;
