import { z } from "zod";

export const NEEDS = ["Product", "AI", "Automation", "CRM", "Integration", "Internal system", "Booking system", "Something else"] as const;
export const STAGES = ["Idea", "Prototype", "Manual workflow", "Existing application", "Production"] as const;
export const GOALS = ["Launch", "Automate", "Scale", "Improve reliability", "Add AI", "Connect systems", "Improve UX"] as const;
export const TIMELINES = ["ASAP", "1–3 months", "Exploring"] as const;

export const briefSchema = z.object({
  needs: z.array(z.enum(NEEDS)).min(1, "Choose at least one.").max(3, "Choose up to three."),
  stage: z.enum(STAGES),
  goal: z.enum(GOALS),
  name: z.string().trim().min(1, "Tell us your name.").max(120),
  email: z.string().trim().email("That email doesn't look right.").max(200),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  context: z.string().trim().max(2000).optional().or(z.literal("")),
  url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https?:\/\/\S+\.\S+/i.test(v), "Enter a full link starting with https://")
    .optional(),
  timeline: z.enum(TIMELINES).optional(),
  /** Honeypot: real users never fill this. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export type BriefInput = z.infer<typeof briefSchema>;
