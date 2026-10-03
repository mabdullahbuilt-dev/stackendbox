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
      { label: "Work", href: "/#work", id: "work" },
      { label: "How We Build", href: "/#process", id: "process" },
      { label: "Company", href: "/#delivery", id: "delivery" },
    ],
    cta: "Start a Project",
  },
  hero: {
    eyebrow: "PRODUCTS · AI · AUTOMATION · INTEGRATIONS",
    lines: ["Build the product.", "Automate the work.", "Connect the stack."],
    support:
      "StackEndBox designs and engineers SaaS, web apps, AI systems, automations, APIs and internal platforms from first brief to production.",
    primary: "Start a Project",
    secondary: "See What We Build",
    chips: ["SaaS", "MVPs", "Web Apps", "AI", "Automation", "CRM", "APIs", "Custom Software"],
  },
  services: {
    eyebrow: "WHAT WE BUILD",
    title: "What can we build for you?",
    support: "From the first idea to the systems your business runs on.",
  },
  intent: {
    eyebrow: "START WITH THE OUTCOME",
    title: "What are you trying to build?",
    support: "Choose the outcome. See what the system behind it could look like.",
  },
  transform: {
    eyebrow: "MANUAL TO AUTOMATED",
    title: "Manual today. Automated tomorrow.",
    support: "Show us the repetitive process. We can turn it into a system.",
    before: "Before",
    after: "After",
  },
  labs: {
    eyebrow: "STACKENDBOX LABS",
    title: "See how we solve real problems.",
    support: "Systems we build internally to demonstrate how we solve real operational and product problems.",
    meta: "BUILT BY STACKENDBOX · CAPABILITY BUILDS",
  },
  product: {
    eyebrow: "PRODUCT DELIVERY",
    title: "From idea to something people can use.",
    support: "We take the brief through product design, engineering and launch.",
    cta: "Build Your MVP",
    brief: "Customers need to book, pay and manage appointments online.",
    captions: ["01 BRIEF", "02 STRUCTURE", "03 WIREFRAME", "04 INTERFACE", "05 BACKEND", "06 ACCESS", "07 BILLING", "08 ADMIN", "09 MOBILE", "10 LIVE"],
  },
  rescue: {
    eyebrow: "EXISTING PRODUCTS",
    titleA: "Already have something?",
    titleB: "We can take it further.",
    support: "A prototype, an inherited codebase or a product that is hard to change. We stabilize it, extend it and get it production ready.",
    cta: "Improve an Existing Product",
    note: "Tell us what you have and where it hurts.",
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
    eyebrow: "AI APPLICATIONS",
    title: "AI should do work, not just answer questions.",
    support: "Connect models to your data, APIs, tools and approval workflows.",
    cta: "Build an AI System",
    verbs: ["classify", "summarize", "retrieve", "generate", "route", "extract", "recommend", "act", "verify"],
  },
  integrations: {
    eyebrow: "INTEGRATIONS",
    title: "Your tools should work together.",
    support: "We connect the systems your business already uses so information moves without manual copying.",
    label: "Systems we can connect",
    techLabel: "TECHNOLOGY WE BUILD WITH",
    cta: "Connect Your Stack",
    events: ["Payment received", "CRM updated", "Meeting booked", "Message sent", "Data synced", "AI summary created"],
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
    title: "From first brief to launch.",
    support: "You see working software early and often.",
  },
  testimonials: { eyebrow: "CLIENT WORDS", title: "What clients say." },
  trust: {
    eyebrow: "DELIVERY",
    title: "What working with StackEndBox looks like.",
    support: "Six commitments that shape every engagement.",
  },
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
