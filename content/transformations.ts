import type { Need } from "@/lib/briefOptions";

/**
 * Manual to automated stories. Each scenario reuses ONE business object: it starts duplicated across
 * disconnected tools and ends as a single record moving through one platform. Industry neutral on purpose.
 */
export type Frag = { icon: string; name: string; badge: string; st: "warn" | "bad" };
export type Step = { icon: string; label: string };
export type Scenario = {
  id: "sales" | "bookings" | "operations" | "support" | "content" | "admin" | "onboarding";
  tab: string;
  system: string;
  object: { icon: string; label: string };
  frags: Frag[];
  steps: Step[];
  line: string;
  cta: string;
  need: Need;
};

export const scenarios: Scenario[] = [
  {
    id: "operations", tab: "Operations", system: "Operations console", object: { icon: "clip", label: "Vendor approval #204" },
    frags: [
      { icon: "mail", name: "Email", badge: "BURIED", st: "warn" },
      { icon: "sheet", name: "Tracker", badge: "3 VERSIONS", st: "bad" },
      { icon: "msg", name: "Chat", badge: "UNSEEN", st: "warn" },
      { icon: "file", name: "Paper form", badge: "SCANNED LATE", st: "warn" },
      { icon: "stamp", name: "Approvals", badge: "STALLED", st: "bad" },
      { icon: "chart", name: "Weekly report", badge: "BY HAND", st: "warn" },
    ],
    steps: [{ icon: "clip", label: "Logged" }, { icon: "branch", label: "Routed" }, { icon: "check-user", label: "Approved" }, { icon: "users", label: "Assigned" }, { icon: "chart", label: "Reported" }],
    line: "Requests are routed by rule, approved in one place and reported automatically.", cta: "Build Internal Software", need: "CRM / Internal Tool",
  },
  {
    id: "sales", tab: "Sales", system: "Sales platform", object: { icon: "user", label: "New enquiry" },
    frags: [
      { icon: "form", name: "Web form", badge: "NOT SYNCED", st: "bad" },
      { icon: "mail", name: "Inbox", badge: "WAITING", st: "warn" },
      { icon: "sheet", name: "Spreadsheet", badge: "DUPLICATE", st: "bad" },
      { icon: "msg", name: "Messages", badge: "UNANSWERED", st: "warn" },
      { icon: "crm", name: "CRM", badge: "STALE", st: "bad" },
      { icon: "cal", name: "Calendar", badge: "CONFLICT", st: "bad" },
    ],
    steps: [{ icon: "form", label: "Captured" }, { icon: "spark", label: "Scored" }, { icon: "check-user", label: "Assigned" }, { icon: "send", label: "Follow-up sent" }, { icon: "cal-check", label: "Meeting booked" }],
    line: "Every enquiry is captured, scored, assigned and followed up.", cta: "Automate Sales Operations", need: "Automation",
  },
  {
    id: "support", tab: "Support", system: "Support desk", object: { icon: "headset", label: "Refund request" },
    frags: [
      { icon: "mail", name: "Support inbox", badge: "BACKLOG", st: "bad" },
      { icon: "msg", name: "Chat widget", badge: "UNANSWERED", st: "warn" },
      { icon: "file", name: "Policy doc", badge: "OUTDATED", st: "warn" },
      { icon: "sheet", name: "Order sheet", badge: "MANUAL LOOKUP", st: "warn" },
      { icon: "archive", name: "Past tickets", badge: "NOT SEARCHABLE", st: "bad" },
      { icon: "users", name: "Escalation chat", badge: "SLOW", st: "warn" },
    ],
    steps: [{ icon: "mail", label: "Received" }, { icon: "search", label: "Policy found" }, { icon: "db", label: "Order checked" }, { icon: "check-user", label: "Approved" }, { icon: "done", label: "Resolved" }],
    line: "Routine requests resolve themselves. Anything uncertain reaches a person.", cta: "Build an AI Support System", need: "AI System",
  },
  {
    id: "bookings", tab: "Bookings", system: "Booking platform", object: { icon: "cal", label: "Booking request" },
    frags: [
      { icon: "msg", name: "Direct messages", badge: "UNREAD", st: "warn" },
      { icon: "phone", name: "Phone calls", badge: "MISSED", st: "bad" },
      { icon: "sheet", name: "Booking sheet", badge: "OVERWRITTEN", st: "bad" },
      { icon: "cal", name: "Calendar", badge: "CONFLICT", st: "bad" },
      { icon: "bell", name: "Reminders", badge: "NOT SENT", st: "warn" },
      { icon: "users", name: "Staff chat", badge: "OUT OF DATE", st: "warn" },
    ],
    steps: [{ icon: "msg", label: "Request received" }, { icon: "cal", label: "Availability checked" }, { icon: "lock", label: "Slot locked" }, { icon: "send", label: "Confirmation sent" }, { icon: "bell", label: "Reminder scheduled" }],
    line: "Availability, booking, confirmation and reminders run as one flow.", cta: "Automate Bookings", need: "Automation",
  },
  {
    id: "admin", tab: "Finance / Admin", system: "Back office", object: { icon: "receipt", label: "Invoice 1042" },
    frags: [
      { icon: "mail", name: "Email PDF", badge: "UNREAD", st: "warn" },
      { icon: "sheet", name: "Spreadsheet", badge: "RETYPED", st: "bad" },
      { icon: "bank", name: "Accounting", badge: "MISMATCH", st: "bad" },
      { icon: "msg", name: "Approval chat", badge: "PENDING", st: "warn" },
      { icon: "card", name: "Payments", badge: "LATE", st: "bad" },
      { icon: "bell", name: "Reminders", badge: "MANUAL", st: "warn" },
    ],
    steps: [{ icon: "scan", label: "Extracted" }, { icon: "compare", label: "Matched" }, { icon: "check-user", label: "Approved" }, { icon: "card", label: "Paid" }, { icon: "folder", label: "Filed" }],
    line: "Documents are read, matched, approved and filed without retyping.", cta: "Automate Back Office Work", need: "Automation",
  },
  {
    id: "onboarding", tab: "Onboarding", system: "Onboarding portal", object: { icon: "user", label: "New client #31" },
    frags: [
      { icon: "mail", name: "Welcome email", badge: "MANUAL", st: "warn" },
      { icon: "file", name: "Contract PDF", badge: "UNSIGNED", st: "bad" },
      { icon: "sheet", name: "Checklist", badge: "OUT OF DATE", st: "bad" },
      { icon: "msg", name: "Chat thread", badge: "BURIED", st: "warn" },
      { icon: "folder", name: "Shared drive", badge: "MISSING FILES", st: "warn" },
      { icon: "cal", name: "Kickoff call", badge: "NOT BOOKED", st: "bad" },
    ],
    steps: [{ icon: "form", label: "Details collected" }, { icon: "stamp", label: "Contract signed" }, { icon: "folder", label: "Workspace created" }, { icon: "users", label: "Team assigned" }, { icon: "cal-check", label: "Kickoff booked" }],
    line: "Details, contracts, access and kickoff happen in one guided flow.", cta: "Build a Client Portal", need: "Web Application",
  },
  {
    id: "content", tab: "Content", system: "Content pipeline", object: { icon: "image", label: "Source material" },
    frags: [
      { icon: "image", name: "Photo folder", badge: "UNSORTED", st: "warn" },
      { icon: "file", name: "Script doc", badge: "BLANK PAGE", st: "warn" },
      { icon: "mic", name: "Voice file", badge: "3 TAKES", st: "bad" },
      { icon: "film", name: "Editor timeline", badge: "HOURS", st: "bad" },
      { icon: "type", name: "Captions", badge: "TYPO FOUND", st: "warn" },
      { icon: "upload", name: "Export", badge: "WAITING", st: "warn" },
    ],
    steps: [{ icon: "eye", label: "Analyzed" }, { icon: "pen", label: "Script written" }, { icon: "mic", label: "Voice created" }, { icon: "film", label: "Assembled" }, { icon: "done", label: "Ready to publish" }],
    line: "Submit the source. The pipeline selects, writes, voices and assembles.", cta: "Build a Content Pipeline", need: "Automation",
  },
];
