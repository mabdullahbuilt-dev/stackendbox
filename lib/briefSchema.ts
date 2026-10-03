import { z } from "zod";

import { GOALS, NEEDS, STAGES, TIMELINES } from "./briefOptions";
export { GOALS, NEEDS, STAGES, TIMELINES };

export const briefSchema = z.object({
  needs: z.array(z.enum(NEEDS)).max(10).default([]),
  stage: z.enum(STAGES).optional(),
  goal: z.enum(GOALS).optional(),
  name: z.string().trim().min(1, "Tell us your name.").max(120),
  email: z.string().trim().email("That email doesn't look right.").max(200),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  context: z.string().trim().min(5, "Tell us a little about what you need.").max(3000),
  url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https?:\/\/\S+\.\S+/i.test(v), "Enter a full link starting with https://")
    .optional(),
  timeline: z.enum(TIMELINES).optional(),
  /** Page the brief was sent from (path only) and referrer origin, for context. */
  source: z.string().trim().max(200).optional().or(z.literal("")),
  referrer: z.string().trim().max(200).optional().or(z.literal("")),
  turnstileToken: z.string().max(4096).optional().or(z.literal("")),
  /** Honeypot: real users never fill this. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export type BriefInput = z.infer<typeof briefSchema>;
