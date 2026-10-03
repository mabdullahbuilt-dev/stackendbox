/** Single source of truth for homepage copy (research §41). */
export const copy = {
  meta: {
    title: "StackEndBox — Software, AI and Automation Built End to End",
    description:
      "StackEndBox is a product-engineering company building SaaS products, AI applications, automation systems and integrations — from first brief to production.",
    ogTitle: "We build the systems businesses run on.",
  },
  nav: {
    links: [
      { label: "Work", href: "/#proof", id: "proof" },
      { label: "Solutions", href: "/#explorer", id: "explorer" },
      { label: "Capabilities", href: "/#depth", id: "depth" },
      { label: "Company", href: "/#process", id: "process" },
    ],
    cta: "Start a Project",
  },
  hero: {
    eyebrow: "PRODUCT ENGINEERING · AI · AUTOMATION",
    h1a: "Software. AI. Automation.",
    h1b: "Built end to end.",
    support:
      "StackEndBox designs and engineers complete products, AI workflows and system integrations — from first brief to production.",
    primary: "Start a Project",
    secondary: "Explore Capabilities",
    micro: "Two-minute brief. No pitch deck needed.",
  },
  transition: "One team across product, AI, operations and infrastructure.",
  explorer: {
    eyebrow: "CAPABILITIES",
    title: "What needs to work?",
    support: "Pick the problem. We'll show what gets built.",
    chip: "SAMPLE DATA · CAPABILITY BUILD",
    after: "See them running →",
  },
  proof: {
    eyebrow: "STACKENDBOX LAB",
    titleA: "See the systems running.",
    support:
      "Demo systems built by StackEndBox with sample data — each one solves a different kind of problem, end to end.",
    cta: "Discuss something like this →",
    hint: "DRAG · SCROLL · ← →",
  },
  manual: {
    eyebrow: "AUTOMATION",
    title: "Turn manual work into a system.",
    support:
      "Spreadsheets, chats, inboxes and calendars become one operation that runs itself.",
    cta: "Discuss an Automation →",
    phases: ["01 SCATTERED", "02 MATCHED", "03 CLEANED UP", "04 CONNECTED", "05 RUNNING"],
  },
  bridge: "Every system starts with a brief, a screen and a promise it will hold up.",
  product: {
    eyebrow: "PRODUCT",
    title: "From brief to working product.",
    support: "Interface, data, auth, billing and admin — designed and engineered together.",
    cta: "Discuss a Product Build →",
    captions: [
      "01 BRIEF",
      "02 WIREFRAME",
      "03 INTERFACE",
      "04 DATA",
      "05 ACCESS",
      "06 BILLING",
      "07 ADMIN",
      "08 LIVE",
    ],
  },
  integrations: {
    eyebrow: "INTEGRATIONS",
    title: "Your tools should work like one system.",
    support:
      "We connect payments, CRMs, calendars, messaging and data so work moves without anyone copying it across.",
    cta: "Discuss an Integration →",
    events: [
      "PAYMENT CONFIRMED",
      "CRM UPDATED",
      "MEETING BOOKED",
      "MESSAGE SENT",
      "AI SUMMARY GENERATED",
      "DATA SYNCED",
    ],
  },
  work: {
    eyebrow: "SELECTED ENGINEERING WORK",
    title: "Real products, real architecture.",
    support: "A short selection. More on request.",
    cta: "View project →",
  },
  depth: {
    eyebrow: "ENGINEERING DEPTH",
    title: "What users see is only one layer.",
    support:
      "Behind every screen: logic, auth, APIs, data, integrations, tests and deployment — built properly, not bolted on.",
    cta: "Talk to our engineers →",
  },
  breadth: {
    eyebrow: "ANY SOFTWARE PROBLEM",
    a: "If software can solve it,",
    b: "talk to us.",
    support:
      "Odd requirement, half-built prototype, a process nobody has automated yet — bring it.",
    cta: "Describe your problem",
    rail: [
      "SaaS",
      "AI Agents",
      "Automation",
      "CRM",
      "Booking Systems",
      "APIs",
      "Payments",
      "Web3",
      "Market Tools",
      "Internal Tools",
      "Dashboards",
      "Data Systems",
      "Operations Software",
      "Analytics",
      "Portals",
      "Integrations",
    ],
  },
  builder: {
    eyebrow: "START HERE",
    title: "Show us what you're building.",
    support: "Three questions. We'll turn your answers into a starting brief.",
    time: "Takes about two minutes.",
  },
  process: {
    eyebrow: "HOW WE WORK",
    title: "Five stages. No black box.",
    support: "You see working software early and often.",
  },
  trust: {
    eyebrow: "TRUST",
    title: "Proof you can open.",
    support:
      "Live demo systems, engineering work you can inspect, and the technical depth behind every build.",
  },
  final: {
    eyebrow: "START A PROJECT",
    a: "Bring us the problem.",
    b: "We'll build the system.",
    support:
      "Tell us what you're trying to solve. We'll tell you honestly how we'd build it.",
    primary: "Start a Project",
    secondary: "Schedule a Call",
    micro: "Two-minute brief. No obligation.",
  },
  footer: {
    tagline: "Software, AI and automation — built end to end.",
  },
} as const;
