/**
 * Client logos. Rendered only when verified === true AND permissionConfirmed === true.
 * Technology and integration logos never belong here (see content/integrations.ts).
 */
export type Client = {
  name: string;
  logo: string;
  url?: string;
  engagement: string;
  verified: boolean;
  permissionConfirmed: boolean;
};

const all: Client[] = [];
export const clients: Client[] = all.filter((c) => c.verified === true && c.permissionConfirmed === true);
