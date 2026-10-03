/** Public homepage copy. Rules: no em dashes, no arrow glyphs, no filler. Arrows are icons in the UI. */
export const copy = {
  meta: {
    title: "StackEndBox | SaaS, AI, Automation & Custom Software",
    description:
      "StackEndBox designs and engineers SaaS products, web applications, AI systems, automations, APIs, CRM tools and custom platforms from idea to production.",
    ogTitle: "We build the systems businesses run on.",
  },
  nav: {
    links: [
      { label: "Services", href: "/#services", id: "services" },
      { label: "Work", href: "/#proof", id: "proof" },
      { label: "How We Build", href: "/#process", id: "process" },
      { label: "Company", href: "/#delivery", id: "delivery" },
    ],
    cta: "Start a Project",
  },
  hero: {
    eyebrow: "PRODUCTS · AI · AUTOMATION · INTEGRATIONS",
    lines: ["Build the product.", "Improve the operation.", "Connect the stack."],
    support:
      "SaaS, web apps, AI systems, internal platforms, automations and custom software, from first brief to production.",
    primary: "Start a Project",
    secondary: "See What We Build",
    chips: ["SaaS", "MVPs", "Web Apps", "AI", "Automation", "CRM", "APIs", "Custom Software"],
  },
  services: {
    eyebrow: "WHAT WE BUILD",
    title: "What can we build for you?",
    support: "From the first idea to the systems your business runs on.",
  },
  start: { eyebrow: "STARTING POINT", title: "Where are you starting from?" },
  intent: {
    eyebrow: "START WITH THE OUTCOME",
    title: "What are you trying to build?",
    support: "Choose the outcome. See what the system behind it could look like.",
  },
  transform: {
    eyebrow: "MANUAL TO SYSTEM",
    title: "Manual today. System tomorrow.",
    support: "Show us the process your team repeats.",
    before: "Before",
    after: "After",
  },
  proof: {
    eyebrow: "PROOF",
    title: "Built to work.",
    support: "Products and systems across software, AI, automation, integrations and specialized platforms.",
  },
  product: {
    eyebrow: "PRODUCT DELIVERY",
    title: "From idea to working product.",
    support: "",
    cta: "Build Your MVP",
    brief: "Customers need to book, pay and manage appointments online.",
    captions: ["01 BRIEF", "02 STRUCTURE", "03 WIREFRAME", "04 INTERFACE", "05 BACKEND", "06 ACCESS", "07 BILLING", "08 ADMIN", "09 MOBILE", "10 LIVE"],
  },
  rescue: {
    eyebrow: "EXISTING PRODUCTS",
    titleA: "Already have something?",
    titleB: "We can take it further.",
    cta: "Improve an Existing Product",
  },
  founders: {
    eyebrow: "FOR FOUNDERS",
    titleA: "Have the idea?",
    titleB: "We can take it to launch.",
    support:
      "Start with a concept, a prototype or a half built product. We turn it into a working MVP and take it through production.",
    primary: "Discuss Your MVP",
    secondary: "Show Us Your Prototype",
  },
  ai: {
    eyebrow: "AI SYSTEMS",
    title: "AI should do work, not just answer questions.",
    cta: "Build an AI System",
  },
  integrations: {
    eyebrow: "INTEGRATIONS",
    title: "Make your tools work as one system.",
    support: "Payments, CRM, calendars, messaging, data and AI, connected around how your business runs.",
    techLabel: "TECHNOLOGY WE BUILD WITH",
    cta: "Connect Your Stack",
  },
  work: {
    eyebrow: "ENGINEERED WORK",
    title: "Selected builds.",
    support: "Products, systems and technical tools engineered from end to end.",
    cta: "View project",
  },
  depth: {
    eyebrow: "ENGINEERING DEPTH",
    title: "The interface is only the visible layer.",
    support:
      "Behind the screen sit the logic, permissions, APIs, data, integrations, tests and deployment that keep the product working.",
    cta: "Talk to an Engineer",
  },
  process: {
    eyebrow: "HOW WE BUILD",
    title: "From problem to production.",
    support: "",
  },
  testimonials: { eyebrow: "CLIENT WORDS", title: "What clients say." },
  why: { eyebrow: "WHY STACKENDBOX", title: "Why teams bring StackEndBox in." },
  builder: {
    eyebrow: "START A PROJECT",
    title: "Tell us what you need.",
    support: "Three quick questions give us enough context to start.",
    time: "About two minutes.",
  },
  final: {
    eyebrow: "LET'S TALK",
    a: "Have something in mind?",
    b: "Let's figure out how to build it.",
    support: "Tell us what you want to launch, automate, connect or improve.",
    primary: "Start a Project",
    secondary: "See Our Work",
  },
  footer: { tagline: "Products, AI and automation built around real business problems." },
} as const;
