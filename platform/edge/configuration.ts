// Overrides are scoped to this acceptance function. Existing production/project
// provider bindings and the authenticated gateway secret are never overwritten.
export const acceptanceSettings = [
  "SPACESHIP_API_KEY", "SPACESHIP_API_SECRET",
  "WHOP_SANDBOX_API_KEY", "WHOP_SANDBOX_WEBHOOK_SECRET",
  "WHOP_SANDBOX_COMPANY_ID", "WHOP_SANDBOX_RENEWAL_PRODUCT_ID",
  "BREVO_CLIENT_API_KEY", "BREVO_API_KEY", "BREVO_CLIENT_SENDER_EMAIL",
  "BREVO_CLIENT_SENDER_NAME", "BREVO_CLIENT_REPLY_TO", "TURNSTILE_SECRET_KEY",
  "BREVO_SENDER_EMAIL", "BREVO_SENDER_NAME", "BRIEF_TO_EMAIL",
  "PORTAL_DIAGNOSTICS_TOKEN",
  "CRON_SECRET", "PORTAL_JOBS_ENABLED",
  "PORTAL_JOB_CLIENT_ALLOWLIST",
  "PORTAL_RELEASE_CHECK_TOKEN",
  "DOMAIN_ACCEPTANCE_GRANT",
] as const;

export function acceptanceConfiguration(base: Record<string, string>, get: (name: string) => string | undefined): Readonly<Record<string, string>> {
  const config = { ...base };
  for (const name of acceptanceSettings) {
    const value = get(`STACKENDBOX_ACCEPTANCE_${name}`);
    if (value?.trim()) config[name] = value.trim();
  }
  const usable = (value?: string) => !!value?.trim() && !/redacted|sensitive|placeholder|^\*+$/i.test(value);
  // Preserve any actual approved reply-to. When no usable value was copied,
  // replies use the verified sender rather than a guessed company address.
  if (!usable(config.BREVO_CLIENT_REPLY_TO) && usable(config.BREVO_CLIENT_SENDER_EMAIL))
    config.BREVO_CLIENT_REPLY_TO = config.BREVO_CLIENT_SENDER_EMAIL;
  // These safeguards cannot be lifted by the credential-entry path.
  return Object.freeze({ ...config, NODE_ENV:"production", WHOP_MODE: "sandbox", DOMAIN_LIVE_PURCHASES_ENABLED: "false",
    DOMAIN_LIVE_RENEWALS_ENABLED: "false", DOMAIN_LIVE_MUTATIONS_ENABLED: "false", DOMAIN_MUTATION_ALLOWLIST: "" });
}

// Prepared release profile. Reuses each provider's own existing secret binding,
// never exchanges public/portal keys or enables money and registrar operations.
export function productionConfiguration(base:Record<string,string>,get:(name:string)=>string|undefined):Readonly<Record<string,string>> {
  const providerConfig=acceptanceConfiguration(base,name=>get(name.replace("STACKENDBOX_ACCEPTANCE_","STACKENDBOX_PRODUCTION_"))||get(name));
  const candidate="https://stackendbox-production.stackendbox.workers.dev";
  const origin=get("STACKENDBOX_PRODUCTION_TEST_ORIGIN")===candidate?candidate:"https://www.stackendbox.com";
  // Candidate testing must never widen the acceptance mail scope. Main-domain
  // dispatch requires its own explicit switch and private scheduler credential.
  const cron=get("STACKENDBOX_PRODUCTION_CRON_SECRET")?.trim()||"";
  const jobs=origin!==candidate && get("STACKENDBOX_PRODUCTION_PORTAL_JOBS_ENABLED")==="true" && cron.length>=32;
  return Object.freeze({...providerConfig,VERCEL_ENV:"production",PORTAL_APP_URL:origin,
    PORTAL_DIAGNOSTICS_TOKEN:"",PORTAL_SANDBOX_CHECKOUT_ENABLED:"false",CRON_SECRET:cron,
    PORTAL_JOB_CLIENT_ALLOWLIST:get("STACKENDBOX_PRODUCTION_PORTAL_JOB_CLIENT_ALLOWLIST")?.trim()||"",
    PORTAL_PROVIDER_RECONCILIATION_ENABLED:jobs?"true":"false",
    PORTAL_JOBS_ENABLED:jobs?"true":"false"});
}
