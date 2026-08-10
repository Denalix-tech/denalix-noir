/**
 * Content for the detailed service landing pages under /services/[slug].
 *
 * Every claim here is grounded in capabilities already described elsewhere in
 * the repository (`servicesPage.pillars` and `digitalizeFirst.items`). No
 * client results, metrics, timelines, or guarantees — those would be invented
 * facts.
 *
 * `metaTitle` deliberately omits the brand: the root layout applies the
 * "%s | Denalix Tech" template, so including it here would duplicate it.
 */

export type ServiceDeliverable = {
  title: string;
  description: string;
};

export type ServiceEngagementStep = {
  step: string;
  title: string;
  description: string;
};

export type ServiceLanding = {
  slug: string;
  /** Short label used in breadcrumbs, related-service cards, and nav. */
  name: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  audience: string;
  problems: string[];
  deliverables: ServiceDeliverable[];
  engagement: ServiceEngagementStep[];
  /** Slugs of the other services shown at the bottom of the page. */
  related: string[];
  /** Plain-language summary used for Service JSON-LD. */
  schemaDescription: string;
  image: string;
};

export const serviceLandings: ServiceLanding[] = [
  {
    slug: "ai-automation-consulting",
    name: "AI Automation Consulting",
    metaTitle: "AI Automation Consulting for Growing Businesses",
    metaDescription:
      "Identify practical AI opportunities, automate repeatable work, connect business tools, and add safeguards with Denalix Tech's AI automation consulting.",
    eyebrow: "AI Automation Consulting",
    h1: "Practical AI automation for growing businesses",
    intro:
      "Most teams do not need an AI strategy deck. They need to know which parts of their day-to-day work can be handled reliably by software, which parts still need a person, and what it would take to get there. We start with the business process, then decide where AI genuinely helps.",
    audience:
      "Startups, local businesses, healthcare teams, and growing companies evaluating where AI can produce real operational value rather than a demo.",
    problems: [
      "Repetitive knowledge work that consumes hours but follows a predictable pattern",
      "Slow intake, where requests arrive by email or phone and get retyped into another system",
      "Manual routing and triage that depends on one person knowing where things should go",
      "Information scattered across tools, so answering a simple question means checking four places",
      "Inconsistent follow-up, where the outcome depends on who picked up the task",
    ],
    deliverables: [
      {
        title: "Workflow assessment",
        description:
          "We map how work actually moves through your business today — the people, tools, handoffs, and decision points — and identify which steps are good candidates for automation and which are not.",
      },
      {
        title: "Prioritized roadmap",
        description:
          "A practical sequence of what to build first, what can wait, and what should be left alone, based on effort and operational impact rather than novelty.",
      },
      {
        title: "AI-assisted workflow design",
        description:
          "Designs for the specific steps where a model adds value — drafting, classifying, extracting, summarizing, or routing — with the surrounding process defined just as carefully.",
      },
      {
        title: "Integrations with your existing tools",
        description:
          "Connections to the systems you already run on, so automated steps read and write in the same place your team works instead of creating another silo.",
      },
      {
        title: "Human review and safeguards",
        description:
          "Review points where a person confirms output before it reaches a customer or a record, plus access controls and cost controls appropriate to the workflow.",
      },
      {
        title: "Staged implementation",
        description:
          "We build in stages so each piece can be checked against real work before the next one starts, rather than switching everything over at once.",
      },
      {
        title: "Measurement and ongoing improvement",
        description:
          "Success criteria agreed up front, visibility into how the automation is behaving, and continued adjustment once it is running against real volume.",
      },
    ],
    engagement: [
      {
        step: "1",
        title: "Understand the process",
        description:
          "We look at the work as it happens today, including the exceptions and workarounds that rarely appear in a process document.",
      },
      {
        step: "2",
        title: "Choose the right candidates",
        description:
          "Not every step should be automated. We separate the work that benefits from automation from the work that needs human judgment.",
      },
      {
        step: "3",
        title: "Build and review in stages",
        description:
          "Each stage is put in front of real work, reviewed with the people who do that work, and adjusted before the next stage begins.",
      },
    ],
    related: ["workflow-automation", "custom-software-development", "dashboards-reporting"],
    schemaDescription:
      "AI automation consulting: workflow assessment, prioritized roadmap, AI-assisted workflow design, integrations, human review safeguards, and staged implementation.",
    image: "/images/team-collaboration.jpg",
  },

  {
    slug: "workflow-automation",
    name: "Workflow Automation",
    metaTitle: "Business Workflow Automation Services",
    metaDescription:
      "Replace repetitive handoffs, duplicate data entry, manual notifications, and scattered approvals with dependable workflow automation.",
    eyebrow: "Workflow Automation",
    h1: "Workflow automation that removes repetitive work",
    intro:
      "When a process depends on someone remembering to forward an email, copy a value into a spreadsheet, or chase an approval, it will eventually be missed. Workflow automation replaces those fragile handoffs with steps that happen the same way every time, and makes the current status visible without anyone having to ask.",
    audience:
      "Teams whose operations run on manual coordination — repeated data entry, email handoffs, and approvals that stall without a reminder.",
    problems: [
      "The same information typed into two or three different systems",
      "Spreadsheet handoffs where the current version is whichever one you were last sent",
      "Approvals that sit until somebody follows up in person",
      "Notifications that depend on a person remembering to send them",
      "No clear answer to \"where is this right now?\" without asking someone",
    ],
    deliverables: [
      {
        title: "Lead and intake automation",
        description:
          "Requests captured once and routed automatically, so nothing depends on retyping a form into another tool.",
      },
      {
        title: "Approval and handoff workflows",
        description:
          "Defined routes with clear owners at each step, so an approval moves forward without someone chasing it.",
      },
      {
        title: "Document generation",
        description:
          "Agreements, summaries, and recurring paperwork produced from data you already hold instead of edited by hand each time.",
      },
      {
        title: "E-signature connections",
        description:
          "Signing wired into the workflow so a completed signature advances the process automatically.",
      },
      {
        title: "Notifications and status updates",
        description:
          "The right people told at the right moment, including the customer-facing updates that otherwise get forgotten under load.",
      },
      {
        title: "System integrations",
        description:
          "The tools you already use connected so information flows between them instead of being carried across by a person.",
      },
    ],
    engagement: [
      {
        step: "1",
        title: "Map the workflow",
        description:
          "We follow one real case end to end and record every handoff, wait, and manual step along the way.",
      },
      {
        step: "2",
        title: "Automate the dependable parts",
        description:
          "Steps that follow clear rules get automated first. Judgment stays with your team, with the routine work cleared out of the way.",
      },
      {
        step: "3",
        title: "Launch and refine",
        description:
          "We run the new flow alongside real work, watch where it needs adjustment, and tighten it as volume increases.",
      },
    ],
    related: ["ai-automation-consulting", "custom-software-development", "dashboards-reporting"],
    schemaDescription:
      "Business workflow automation: intake automation, approval flows, document generation, e-signature connections, notifications, status updates, and system integrations.",
    image: "/images/operations-warehouse.jpg",
  },

  {
    slug: "custom-software-development",
    name: "Custom Software Development",
    metaTitle: "Custom Software Development for Business Operations",
    metaDescription:
      "Build internal tools, customer portals, booking flows, integrations, and operational software around the way your business works.",
    eyebrow: "Custom Software",
    h1: "Custom software built around your business operations",
    intro:
      "Off-the-shelf tools assume your business works a particular way. When it does not, teams end up with workarounds, side spreadsheets, and processes that live in one person's head. Custom software is worth building when the way you operate is the thing that makes the business work — and bending it to fit a product would cost more than building the right tool.",
    audience:
      "Companies whose operations have outgrown generic tools, or whose key processes depend on a founder or a single experienced employee.",
    problems: [
      "Off-the-shelf tools that fit most of the process but not the part that matters",
      "Fragmented systems that do not share data, so the full picture lives in someone's head",
      "Founder-dependent processes that cannot be handed to a new team member",
      "Customers who have to email or call for information they could serve themselves",
      "Manual reporting assembled by hand because no system holds the whole story",
    ],
    deliverables: [
      {
        title: "Discovery and scoping",
        description:
          "We define the problem in business terms before writing code, including what success should look like and what is deliberately out of scope.",
      },
      {
        title: "Practical roadmap",
        description:
          "A staged plan covering what to build first, what can wait, and what it is likely to involve — so decisions are made before budget is committed.",
      },
      {
        title: "Internal tools and staff portals",
        description:
          "Software shaped around how your team actually works, replacing the spreadsheets and shared documents holding a process together.",
      },
      {
        title: "Customer-facing applications",
        description:
          "Portals, booking flows, and self-service experiences that reduce the back-and-forth of intake, scheduling, and status requests.",
      },
      {
        title: "Integrations between systems",
        description:
          "Connections to the platforms you already depend on, so new software fits into your operation instead of standing beside it.",
      },
      {
        title: "Staged launch and support",
        description:
          "Released in stages with your team using it against real work, and continued support once it is live.",
      },
    ],
    engagement: [
      {
        step: "1",
        title: "Define the problem",
        description:
          "We start from the operational bottleneck, not a feature list, and confirm that custom software is genuinely the right answer.",
      },
      {
        step: "2",
        title: "Build in stages",
        description:
          "Working software early and often, so you are reacting to something real rather than approving a specification.",
      },
      {
        step: "3",
        title: "Launch and support",
        description:
          "We move your team onto it in a controlled way and keep improving it with feedback once it is carrying real work.",
      },
    ],
    related: ["workflow-automation", "ai-automation-consulting", "dashboards-reporting"],
    schemaDescription:
      "Custom software development: discovery, roadmap, internal tools, customer-facing applications, portals, system integrations, staged launch, and ongoing support.",
    image: "/images/roadmap-planning.jpg",
  },

  {
    slug: "dashboards-reporting",
    name: "Dashboards & Reporting",
    metaTitle: "Business Dashboards & Reporting Solutions",
    metaDescription:
      "Bring operational data together in live dashboards, leadership reports, and alerts that make business performance easier to understand.",
    eyebrow: "Dashboards & Reporting",
    h1: "Dashboards that turn operational data into clear decisions",
    intro:
      "Most businesses already hold the data they need — it is spread across a CRM, a finance tool, a scheduling system, and a few spreadsheets. The cost is not storage, it is the delay and manual effort between a question being asked and an answer arriving. Good reporting closes that gap and makes the current state of the business visible without a monthly assembly exercise.",
    audience:
      "Leaders and operations teams making decisions from month-end summaries, or from numbers rebuilt by hand each time they are needed.",
    problems: [
      "Reporting that only arrives at month-end, long after a decision needed to be made",
      "Data split across tools that do not agree with each other",
      "Spreadsheets rebuilt by hand every reporting cycle",
      "No shared view of what is happening across operations right now",
      "Problems noticed only after they have already affected customers",
    ],
    deliverables: [
      {
        title: "Data source assessment",
        description:
          "A review of the systems that hold your operational data, how reliable each one is, and what can realistically be reported on today.",
      },
      {
        title: "Data connections",
        description:
          "Connections to the tools you already use, so reporting draws from live systems rather than exported copies.",
      },
      {
        title: "KPI definition",
        description:
          "Agreement on what each number actually means before it is displayed, so a metric means the same thing to everyone reading it.",
      },
      {
        title: "Live operations dashboards",
        description:
          "A current view of what is happening across the business, built for the people who need to act on it.",
      },
      {
        title: "Custom reporting for leadership",
        description:
          "Reports shaped around the decisions being made, rather than whatever the source tool exports by default.",
      },
      {
        title: "Alerts for the metrics that matter",
        description:
          "Notifications when something moves outside its expected range, so issues surface without someone watching a screen.",
      },
    ],
    engagement: [
      {
        step: "1",
        title: "Agree the questions",
        description:
          "We start from the decisions you need to make, then work backwards to the metrics that inform them.",
      },
      {
        step: "2",
        title: "Connect and validate",
        description:
          "We connect the sources and check the numbers against reality before anyone is asked to trust a dashboard.",
      },
      {
        step: "3",
        title: "Refine in use",
        description:
          "Dashboards change once people use them. We adjust as the real questions become clear.",
      },
    ],
    related: ["workflow-automation", "custom-software-development", "gis-mapping"],
    schemaDescription:
      "Business dashboards and reporting: data source assessment, data connections, KPI definition, live operations dashboards, custom leadership reports, and alerting.",
    image: "/images/dashboard-analytics.jpg",
  },

  {
    slug: "gis-mapping",
    name: "GIS & Mapping",
    metaTitle: "GIS Mapping & Location Intelligence Solutions",
    metaDescription:
      "Use interactive maps, service-area analysis, territory planning, routes, and field data to make better location-based decisions.",
    eyebrow: "GIS & Location Intelligence",
    h1: "GIS and mapping systems for location-based operations",
    intro:
      "For businesses that run on geography — service areas, field teams, routes, or multiple locations — the important patterns are hard to see in a table. Putting operational data on a map turns territory, coverage, and travel decisions into something you can look at and reason about, instead of estimating from experience.",
    audience:
      "Operations that depend on where work happens: field services, multi-site businesses, delivery and route planning, and territory-based teams.",
    problems: [
      "Territories defined by habit rather than by current coverage or demand",
      "Routes planned from familiarity, with the cost of inefficiency spread invisibly across the week",
      "Field data captured on paper or in a separate app, disconnected from the office",
      "No clear view of which areas are actually served well and which are not",
      "Location decisions argued from opinion because the underlying data is not visible",
    ],
    deliverables: [
      {
        title: "Interactive maps",
        description:
          "Your operational data displayed geographically, so coverage, density, and gaps are visible at a glance.",
      },
      {
        title: "Territory planning",
        description:
          "Territories shaped around real demand and travel cost, with the ability to test a change before committing to it.",
      },
      {
        title: "Service-area analysis",
        description:
          "A clear picture of where you can realistically serve customers well, and what extending that area would involve.",
      },
      {
        title: "Route support",
        description:
          "Planning tools that account for the sequence and geography of daily work rather than treating each stop in isolation.",
      },
      {
        title: "Geo-tagged field tools",
        description:
          "Field capture tied to location and fed back into the same systems the office uses, removing the paper step.",
      },
      {
        title: "Location-aware dashboards",
        description:
          "Location layered onto your operational reporting, so geographic patterns show up alongside everything else.",
      },
    ],
    engagement: [
      {
        step: "1",
        title: "Understand the geography",
        description:
          "We look at how location actually affects your operation — travel, coverage, density, and constraints.",
      },
      {
        step: "2",
        title: "Bring the data onto a map",
        description:
          "Existing operational data is connected and displayed geographically, which is usually where the first surprises appear.",
      },
      {
        step: "3",
        title: "Build the working tools",
        description:
          "Planning and field tools built on that foundation, then refined as your team uses them in the field.",
      },
    ],
    related: ["dashboards-reporting", "custom-software-development", "workflow-automation"],
    schemaDescription:
      "GIS and location intelligence: interactive maps, territory planning, service-area analysis, route support, geo-tagged field tools, and location-aware dashboards.",
    image: "/images/operations-warehouse.jpg",
  },
];

export const serviceSlugs = serviceLandings.map((service) => service.slug);

export function getServiceLanding(slug: string): ServiceLanding | undefined {
  return serviceLandings.find((service) => service.slug === slug);
}
