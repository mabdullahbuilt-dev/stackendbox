import type { Need } from "@/lib/briefOptions";

/**
 * Manual to automated stories. Each scenario reuses ONE business object: it starts duplicated across
 * disconnected tools and ends as a single record moving through one platform. Industry neutral on purpose.
 */
export type Frag = { icon: string; name: string; badge: string; st: "warn" | "bad" };
export type Step = { icon: string; label: string };
export type Scenario = {
  id: "operations" | "sales" | "bookings";
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
    line: "Requests are routed by rule, approved in one place and reported automatically.", cta: "Turn a Process Into Software", need: "CRM / Internal Tool",
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
];
