/**
 * Content and figures for /pricing.
 *
 * Every number a prospect can see lives in this file. Changing a price is a
 * one-line edit here and needs no component changes.
 *
 * Two conventions carried over from `services-data.ts`, for the same reason:
 *
 * 1. No invented facts. No client results, no "trusted by" counts, no delivery
 *    times presented as a record. Engagement length is therefore absent from
 *    the tiers — it is agreed in the written quote, where it can be true.
 *
 * 2. Prices are ranges, not single figures. The same brief can differ
 *    threefold depending on how many systems have to agree and how clearly the
 *    rules are already written down, and one number against an unfixed scope is
 *    either padded to cover the unknowns or abandoned halfway. The firm figure
 *    is the one in the quote that follows discovery.
 *
 * The entry tier is deliberately a paid assessment rather than a cheap build.
 * A low number attached to software invites price-shopping and unbounded scope;
 * the same number attached to a scoped piece of thinking lowers the risk of
 * starting without discounting the work that follows.
 */

export type PricingTier = {
  /** Stable id, used for the anchor and as the React key. */
  id: string;
  /** Short label above the name. */
  eyebrow: string;
  name: string;
  /** Rendered verbatim, so it carries the range dash and the currency. */
  price: string;
  /** Sits under the price — billing shape, not a discount. */
  priceNote: string;
  /** One sentence on who this is for. */
  bestFor: string;
  /** Bulleted scope. Written as deliverables, not features. */
  includes: string[];
  /** Drawn as the emphasised card. Exactly one tier should set this. */
  featured?: boolean;
  cta: { label: string; href: string };
};

export const pricingPage = {
  eyebrow: "Pricing",
  heading: "What an engagement costs",
  body:
    "Published ranges, so you can tell before a call whether we are the right fit for your budget. Where you land inside a range depends on scope — the exact number is fixed in a written quote once that is agreed, and it does not move afterwards.",

  currencyNote: "All figures in USD, excluding tax.",

  tiers: [
    {
      id: "discovery",
      eyebrow: "Start here",
      name: "Discovery Sprint",
      price: "$500",
      priceNote: "Fixed. Credited in full against a build if you continue.",
      bestFor:
        "Teams who know something is slow or manual but not yet what to build, or what it should cost.",
      includes: [
        "A walkthrough of how the work moves through your business today — people, tools, handoffs, and the decision points between them",
        "A written map of that process, including the steps worth automating and the ones that should stay with a person",
        "A build plan in priority order: what to do first, what can wait, and what to leave alone",
        "A fixed quote for the work, with the scope written down",
        "Yours to keep and act on, with us or without us",
      ],
      cta: { label: "Book a discovery sprint", href: "/contact" },
    },
    {
      id: "build",
      eyebrow: "Tier one",
      name: "Build",
      price: "$1,500 – $3,500",
      priceNote: "Fixed within this range once the scope is agreed.",
      bestFor:
        "One workflow moved off spreadsheets, email, and paper into a tool your team actually opens.",
      includes: [
        "A working application with a database designed for your process, not a generic template",
        "Create, read, update, and delete on the records your team handles daily, with validation that stops bad data at entry",
        "Accounts and roles, so people see what they should and nothing else",
        "A dashboard covering the numbers you currently pull together by hand",
        "Deployed, on your own domain, with documentation and a handover session",
        "Thirty days of fixes after handover, at no additional cost",
      ],
      cta: { label: "Discuss a build", href: "/contact" },
    },
    {
      id: "systems",
      eyebrow: "Tier two",
      name: "Systems & Operations",
      price: "From $4,000",
      priceNote:
        "Fixed in the quote once scope is agreed. Or $1,500 – $3,000 per month as an ongoing partnership.",
      bestFor:
        "Work that spans several tools and teams, built and then run and improved rather than handed over and left.",
      includes: [
        "Everything in Build, across every connected process in the business",
        "Complete AI automation and workflow across the operating layer — AI where it genuinely helps, conventional software where it does not",
        "Integrations with the systems you already pay for, so records are entered once rather than retyped",
        "Business logic with real complexity — approvals, routing, scheduling, pricing rules, audit trails",
        "Permissions modelled properly, where different roles hold genuinely different authority",
        "Data pipelines and migration — records moved and reconciled between systems, with the mismatches resolved before cutover",
        "The infrastructure underneath it: environments, backups, monitoring, access control, and a deployment process",
        "Safeguards on anything automated: a human in the loop where a wrong answer would be expensive",
        "A marketing site built to be found — technical SEO, structured data, and content published on a rhythm",
        "A named point of contact, a regular review, and ongoing changes as the business changes rather than a fresh quote for every request",
      ],
      featured: true,
      cta: { label: "Scope a system", href: "/contact" },
    },
  ] satisfies PricingTier[],

  /**
   * The honest part. A prospect comparing quotes wants to know why one number
   * differs from another, and saying so up front removes most of the awkward
   * conversation later.
   */
  drivers: {
    eyebrow: "What moves the number",
    heading: "Why a quote lands where it does",
    body:
      "Two projects that sound identical in a first conversation can differ by a factor of three. These are the things that actually account for it.",
    items: [
      {
        title: "How many systems have to agree",
        description:
          "One application with its own database is straightforward. The same application reconciling records across three tools you already run is a different piece of work, and most of the cost is in the disagreements between them.",
      },
      {
        title: "How clear the rules are",
        description:
          "If the rules live in one person's head and change by exception, writing them down is the project. Where a process is already documented and consistent, the build is faster and cheaper.",
      },
      {
        title: "What already exists",
        description:
          "Clean data in a structured system migrates quickly. Years of spreadsheets with inconsistent columns, duplicates, and free-text where there should be categories takes real time to reconcile.",
      },
      {
        title: "Who has to be right",
        description:
          "An internal tool used by five people you can correct informally. Anything touching billing, patient records, or a regulator needs a level of validation, audit trail, and review that costs more and is worth it.",
      },
      {
        title: "How much is genuinely AI",
        description:
          "Plenty of work labelled AI is better served by ordinary software that is cheaper to run and easier to trust. Where a model is the right answer, it brings ongoing running costs that a one-off build does not.",
      },
    ],
  },

  /**
   * Stated plainly, because the alternative is discovering it in month two.
   * Third-party costs are billed by the third party, not marked up here.
   */
  excluded: {
    eyebrow: "Not included",
    heading: "Costs that are yours, not ours",
    body:
      "These are paid directly to the provider at whatever they charge. We help you size them before you commit, and we do not add a margin to them.",
    items: [
      "Hosting, databases, and domains — typically modest for a single application, and larger once traffic or data grows",
      "AI model usage, which is charged per request and scales with how much you automate",
      "Licences for third-party software you choose to keep or adopt",
      "Paid advertising budget, where a marketing engagement includes it",
    ],
  },

  faq: {
    eyebrow: "Before you ask",
    heading: "The questions that come up first",
    items: [
      {
        question: "Why a range instead of one fixed price?",
        answer:
          "Because a single price on an unfixed scope is either padded to cover the unknowns or quietly abandoned halfway through. The range tells you whether we are the right fit for your budget; the quote after discovery is firm, written down, and does not move unless you change what you asked for.",
      },
      {
        question: "Do I have to start with the Discovery Sprint?",
        answer:
          "No. If you already know what you want built and can describe it, we can quote directly. The sprint exists for the more common case, where the problem is clear but the solution is not — and its cost comes off the build if you go ahead.",
      },
      {
        question: "What if the project turns out to be smaller than the tier?",
        answer:
          "Then the quote comes in at the lower end, or below it. The ranges describe the shape of an engagement, not a minimum we hold you to after finding out it is simpler than expected.",
      },
      {
        question: "Do you charge hourly?",
        answer:
          "Not for project work. You get a fixed number against a written scope, so the risk of an estimate running over sits with us rather than with you. Ongoing engagements are billed monthly instead.",
      },
      {
        question: "What happens after handover?",
        answer:
          "Thirty days of fixes are included on any build. After that you can take it in-house — the code, the documentation, and the accounts are yours — or keep us on monthly for changes as the business changes.",
      },
    ],
  },
};
