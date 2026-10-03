import type { Need } from "@/lib/briefOptions";

/** Positions are percentages of the stage (center of each item). */
export type TItem = {
  icon: string;
  before: { title: string; sub: string; x: number; y: number; r: number; tone: number };
  after: { title: string; sub: string; x: number; y: number };
};
export type Scenario = {
  id: "leads" | "bookings" | "operations" | "content";
  tab: string;
  headline: string;
  beforeNote: string;
  afterNote: string;
  cta: string;
  need: Need;
  items: TItem[];
};

const grid = (i: number) => ({ x: 14 + (i % 4) * 24, y: i < 4 ? 30 : 70 });

export const scenarios: Scenario[] = [
  {
    id: "leads", tab: "Leads", headline: "Lead operations", beforeNote: "Forms, spreadsheets and inboxes. Leads wait, get missed and get followed up late.", afterNote: "Every lead is scored, routed, followed up and booked automatically.", cta: "Automate Lead Operations", need: "Automation",
    items: [
      { icon: "form", before: { title: "Website form", sub: "name, email, notes", x: 18, y: 24, r: -4, tone: 0 }, after: { title: "Lead arrives", sub: "captured instantly", ...grid(0) } },
      { icon: "sheet", before: { title: "leads_v3.xlsx", sub: "duplicate rows", x: 44, y: 20, r: 3, tone: 1 }, after: { title: "AI score", sub: "82 / 100 qualified", ...grid(1) } },
      { icon: "mail", before: { title: "Inbox", sub: "14 unread", x: 74, y: 28, r: -2, tone: 2 }, after: { title: "CRM updated", sub: "owner assigned", ...grid(2) } },
      { icon: "check", before: { title: "Manual check", sub: "who is this lead?", x: 30, y: 52, r: 5, tone: 3 }, after: { title: "Message sent", sub: "follow up drafted", ...grid(3) } },
      { icon: "crm", before: { title: "CRM entry", sub: "status: stale", x: 58, y: 56, r: -3, tone: 0 }, after: { title: "Calendar open", sub: "3 slots offered", ...grid(4) } },
      { icon: "msg", before: { title: "Follow up", sub: "forgot to reply", x: 82, y: 62, r: 4, tone: 3 }, after: { title: "Meeting booked", sub: "Thursday 14:00", ...grid(5) } },
      { icon: "cal", before: { title: "Calendar", sub: "double booked", x: 22, y: 80, r: -5, tone: 1 }, after: { title: "Reminder queued", sub: "24h before", ...grid(6) } },
      { icon: "chart", before: { title: "Missed leads", sub: "no one noticed", x: 62, y: 84, r: 2, tone: 2 }, after: { title: "Analytics", sub: "pipeline updated", ...grid(7) } },
    ],
  },
  {
    id: "bookings", tab: "Bookings", headline: "Bookings and customer operations", beforeNote: "Messages, calls and a calendar nobody trusts. Confirmations go out by hand.", afterNote: "Availability, booking, confirmation, reminders and rescheduling run as one flow.", cta: "Automate Bookings", need: "Automation",
    items: [
      { icon: "msg", before: { title: "DM request", sub: "table for four?", x: 18, y: 24, r: -3, tone: 0 }, after: { title: "Request received", sub: "from any channel", ...grid(0) } },
      { icon: "phone", before: { title: "Phone call", sub: "missed at 18:02", x: 46, y: 20, r: 4, tone: 3 }, after: { title: "Availability checked", sub: "Fri 19:30 is free", ...grid(1) } },
      { icon: "sheet", before: { title: "Booking sheet", sub: "overwritten twice", x: 76, y: 26, r: -2, tone: 1 }, after: { title: "Booking created", sub: "table 4, party of 4", ...grid(2) } },
      { icon: "cal", before: { title: "Calendar", sub: "conflict", x: 30, y: 52, r: 5, tone: 2 }, after: { title: "Confirmation sent", sub: "guest notified", ...grid(3) } },
      { icon: "check", before: { title: "Manual confirm", sub: "still pending", x: 60, y: 56, r: -4, tone: 0 }, after: { title: "Reminder scheduled", sub: "2h before", ...grid(4) } },
      { icon: "bell", before: { title: "Reminder", sub: "nobody sent it", x: 84, y: 62, r: 3, tone: 3 }, after: { title: "Reschedule handled", sub: "one tap for guest", ...grid(5) } },
      { icon: "crm", before: { title: "Guest notes", sub: "in someone's head", x: 22, y: 80, r: -5, tone: 1 }, after: { title: "Customer record", sub: "history saved", ...grid(6) } },
      { icon: "users", before: { title: "Staff chat", sub: "who has Friday?", x: 62, y: 84, r: 2, tone: 2 }, after: { title: "Team notified", sub: "shift view updated", ...grid(7) } },
    ],
  },
  {
    id: "operations", tab: "Operations", headline: "Internal operations", beforeNote: "Requests arrive in chat and email. Approvals stall and reporting is a weekly chore.", afterNote: "Requests are routed by rule, approved in one place and reported automatically.", cta: "Build Internal Software", need: "CRM / Internal Tool",
    items: [
      { icon: "mail", before: { title: "Request by email", sub: "buried in a thread", x: 18, y: 24, r: -4, tone: 0 }, after: { title: "Request logged", sub: "single intake form", ...grid(0) } },
      { icon: "msg", before: { title: "Chat ping", sub: "did anyone see this?", x: 46, y: 20, r: 3, tone: 2 }, after: { title: "Routed by rule", sub: "finance queue", ...grid(1) } },
      { icon: "sheet", before: { title: "Tracker sheet", sub: "three versions", x: 76, y: 26, r: -2, tone: 1 }, after: { title: "Approval requested", sub: "manager notified", ...grid(2) } },
      { icon: "check", before: { title: "Approval", sub: "waiting a week", x: 30, y: 52, r: 5, tone: 3 }, after: { title: "Approved", sub: "audit trail saved", ...grid(3) } },
      { icon: "users", before: { title: "Who owns it?", sub: "unclear", x: 60, y: 56, r: -3, tone: 0 }, after: { title: "Owner assigned", sub: "due date set", ...grid(4) } },
      { icon: "file", before: { title: "Paper form", sub: "scanned late", x: 84, y: 62, r: 4, tone: 2 }, after: { title: "Task completed", sub: "status visible", ...grid(5) } },
      { icon: "chart", before: { title: "Weekly report", sub: "built by hand", x: 22, y: 80, r: -5, tone: 1 }, after: { title: "Report updated", sub: "always current", ...grid(6) } },
      { icon: "bell", before: { title: "Reminders", sub: "in calendars", x: 62, y: 84, r: 2, tone: 3 }, after: { title: "Team alerted", sub: "only when needed", ...grid(7) } },
    ],
  },
  {
    id: "content", tab: "Content", headline: "Property reels", beforeNote: "Download photos, write captions, record audio, edit clips, export. Every single listing.", afterNote: "Submit the listing. The pipeline picks shots, writes, voices and assembles the reel.", cta: "Build a Content Workflow", need: "Automation",
    items: [
      { icon: "image", before: { title: "Download photos", sub: "18 files", x: 18, y: 24, r: -4, tone: 0 }, after: { title: "Listing submitted", sub: "photos and details", ...grid(0) } },
      { icon: "scissors", before: { title: "Pick shots", sub: "by eye, again", x: 46, y: 20, r: 3, tone: 1 }, after: { title: "Photos analyzed", sub: "best 6 selected", ...grid(1) } },
      { icon: "pen", before: { title: "Write captions", sub: "blank page", x: 76, y: 26, r: -2, tone: 2 }, after: { title: "Script generated", sub: "tone matched", ...grid(2) } },
      { icon: "mic", before: { title: "Record voice", sub: "three takes", x: 30, y: 52, r: 5, tone: 3 }, after: { title: "Voice created", sub: "natural narration", ...grid(3) } },
      { icon: "film", before: { title: "Edit clips", sub: "timeline in a editor", x: 60, y: 56, r: -3, tone: 0 }, after: { title: "Scenes rendered", sub: "vertical format", ...grid(4) } },
      { icon: "music", before: { title: "Add music", sub: "license check", x: 84, y: 62, r: 4, tone: 2 }, after: { title: "Audio mixed", sub: "voice and track", ...grid(5) } },
      { icon: "type", before: { title: "Burn captions", sub: "typo found late", x: 22, y: 80, r: -5, tone: 1 }, after: { title: "Captions added", sub: "timed to voice", ...grid(6) } },
      { icon: "upload", before: { title: "Export", sub: "45 minutes later", x: 62, y: 84, r: 2, tone: 3 }, after: { title: "Ready to publish", sub: "reel exported", ...grid(7) } },
    ],
  },
];
