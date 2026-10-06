/** Public homepage copy. Rules: no em dashes, no arrow glyphs, no filler. Arrows are icons in the UI. */
export const copy = {
  meta: {
    title: "StackEndBox | Product Engineering, AI & Custom Software",
    description:
      "StackEndBox is a product engineering company. We design and build SaaS products, web applications, custom software, AI systems, internal platforms, APIs, integrations and automation from idea to production.",
    ogTitle: "We design and build the software your business needs.",
  },
  nav: {
    left: [
      { label: "Services", href: "/#services", id: "services" },
      { label: "Work", href: "/#proof", id: "proof" },
    ],
    right: [
      { label: "How We Build", href: "/#process", id: "process" },
      { label: "Company", href: "/#delivery", id: "delivery" },
    ],
    contact: { label: "Contact Us", href: "/#start", id: "start" },
    cta: "Start a Project",
  },
  hero: {
    eyebrow: "PRODUCT ENGINEERING · SOFTWARE · AI · SYSTEMS",
    lines: ["Build the product.", "Engineer the system.", "Take it to production."],
    support:
      "StackEndBox designs and builds SaaS, web applications, custom software, AI systems, integrations and specialized platforms from first brief to production.",
    primary: "Start a Project",
    secondary: "Book a Call",
  },
  services: {
    eyebrow: "WHAT WE BUILD",
    title: "What can we build for you?",
    support: "Hire us to design and engineer the product, platform or system you need.",
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
    support: "We turn a manual process into software your team can own.",
    before: "Before",
    after: "After",
  },
  proof: {
    eyebrow: "PROOF",
    title: "Built to work.",
    support: "Products and platforms we have designed and engineered, across software, business systems, AI, backend and specialized domains.",
  },
  business: {
    eyebrow: "BUSINESS SOFTWARE",
    title: "Management software, built around how you run.",
    support: "Customer records, teams, projects, roles, approvals, reporting and an audit trail, designed as one application your people use every day.",
    cta: "Discuss Custom Software",
  },
  specialized: {
    eyebrow: "SPECIALIZED SYSTEMS",
    title: "Some problems need software that does not exist yet.",
    support: "Market systems, Web3 products, developer tools and specialist platforms, engineered around the domain.",
    cta: "Scope Specialized Software",
  },
  product: {
    eyebrow: "PRODUCT DELIVERY",
    title: "From brief to live product.",
    support: "",
    cta: "Build Your MVP",
    brief: "A client portal: accounts, requests, documents, payments and an admin console.",
    captions: ["01 BRIEF", "02 STRUCTURE", "03 WIREFRAME", "04 INTERFACE", "05 BACKEND", "06 ACCESS", "07 BILLING", "08 ADMIN", "09 MOBILE", "10 LIVE"],
  },
  rescue: {
    eyebrow: "EXISTING PRODUCTS",
    titleA: "Already have a product?",
    titleB: "We can make it stronger.",
    support: "Redesign the interface, fix weak architecture, add missing capabilities and take the product back to reliable production.",
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
    title: "We build AI into real software.",
    cta: "Discuss an AI System",
  },
  integrations: {
    eyebrow: "INTEGRATIONS",
    title: "We engineer the layer between your systems.",
    support: "We build the integration layer: APIs, webhooks, mapping and synchronization between the systems your product depends on.",
    techLabel: "TECHNOLOGY WE BUILD WITH",
    cta: "Discuss Your Integration",
  },
  work: {
    eyebrow: "ENGINEERED WORK",
    title: "Shipped products.",
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
  why: { eyebrow: "WHY STACKENDBOX", title: "Why clients bring StackEndBox in.", support: "What changes when one team owns the whole build, from the first conversation to the system running in production." },
  builder: {
    eyebrow: "CONTACT US",
    title: "Tell us what needs to work.",
    support: "Describe the product, system or problem. We can take it from there.",
    time: "No account needed. Type it in your own words.",
  },
  final: {
    eyebrow: "LET'S TALK",
    a: "Bring us the problem.",
    b: "We will engineer what it needs.",
    support: "Send a brief, email us, or book a call.",
    primary: "Start a Project",
    secondary: "See Our Work",
  },
  footer: { tagline: "Product engineering, AI and custom software from brief to production." },
} as const;
