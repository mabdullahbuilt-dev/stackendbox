import type { BrandKey } from "./brandIcons";

export const systems: { key: BrandKey; label: string; action: string }[] = [
  { key: "stripe", label: "Stripe", action: "Payment received" },
  { key: "hubspot", label: "HubSpot", action: "Deal updated" },
  { key: "whatsapp", label: "WhatsApp", action: "Confirmation sent" },
  { key: "gcal", label: "Google Calendar", action: "Meeting booked" },
  { key: "gmail", label: "Gmail", action: "Follow up sent" },
  { key: "gdrive", label: "Google Drive", action: "Document filed" },
  { key: "supabase", label: "Supabase", action: "Record synced" },
  { key: "postgres", label: "PostgreSQL", action: "Data stored" },
  { key: "anthropic", label: "Anthropic", action: "Summary generated" },
  { key: "github", label: "GitHub", action: "Release tagged" },
  { key: "vercel", label: "Vercel", action: "Deployment live" },
  { key: "notion", label: "Notion", action: "Page created" },
];
