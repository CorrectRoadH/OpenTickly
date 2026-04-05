export const homeContentEn = {
  hero: {
    eyebrow: "Free, Private-First Toggl Alternative",
    title: "OpenToggl keeps the Toggl workflow without the lock-in.",
    body: "OpenToggl is a free, private-first, AI-friendly Toggl alternative. It targets the current public Toggl surface, ships the matching web app, supports self-hosting, and keeps the managed demo public.",
    ctas: {
      liveDemo: "Live Demo",
      github: "GitHub",
      selfHosting: "Self-Hosting Guide",
    },
  },

  whatIs: {
    title: "What OpenToggl is",
    description:
      "OpenToggl is not a Toggl-inspired tracker. It takes Toggl's current public product surface as the implementation target.",
    items: [
      {
        title: "Contract-first",
        body: "Docs, OpenAPI, and the web surface define the product. Drift gets fixed in code.",
      },
      {
        title: "Not partial compatibility",
        body: "The goal is the real public surface, not a vague compatibility claim.",
      },
      {
        title: "Disciplined scope",
        body: "Beyond import and instance admin, it does not invent a different product model.",
      },
    ],
  },

  capability: {
    title: "Compatibility surface",
    description:
      "The point is not a feature checklist. Teams coming from Toggl should keep the same workflow, scripts, and mental model.",
    items: [
      {
        title: "Track time",
        body: "Time entries, projects, clients, tags, tasks, and the matching workflows.",
      },
      {
        title: "Run reports",
        body: "Summary, detailed, and weekly reporting on the same public surface.",
      },
      {
        title: "Operate webhooks",
        body: "Use webhook flows without rebuilding your integrations around a new tool.",
      },
    ],
  },

  why: {
    title: "Why switch",
    description: "The reason to move is control over cost, data, and automation.",
    items: [
      {
        title: "Pricing pressure",
        body: "For many individuals and teams, official Toggl pricing is the main reason to leave.",
      },
      {
        title: "Private-first data",
        body: "Keep time data in infrastructure and PostgreSQL you control.",
      },
      {
        title: "Better for automation",
        body: "AI agents and scripts need predictable throughput, not tight vendor limits.",
      },
      {
        title: "Mobile PWA",
        body: "Add it to the home screen and use it like an app without an app store gate.",
      },
    ],
  },

  selfHost: {
    title: "Why self-host",
    description:
      "Self-hosting should be a documented path, not a separate product tier with missing pieces.",
    items: [
      {
        title: "Your deployment schedule",
        body: "Choose where to run it and when to upgrade it.",
      },
      {
        title: "No hidden split",
        body: "The hosted product and self-hosted install are the same product.",
      },
      {
        title: "Clear runbooks",
        body: "Use the self-hosting docs for Docker Compose, CasaOS, Synology, and fnOS.",
      },
    ],
  },

  proof: {
    title: "Open source proof",
    description: "The demo, docs, and repo are public. You can verify the claim yourself.",
    items: [
      {
        title: "Live demo",
        value: "track.opentoggl.com",
        body: "Open the managed instance and inspect the product before you commit.",
        cta: "Open demo",
        href: "https://track.opentoggl.com",
      },
      {
        title: "Repository",
        value: "CorrectRoadH/opentoggl",
        body: "Read the code, follow issues, and inspect the self-hosting implementation.",
        cta: "Open GitHub",
        href: "https://github.com/CorrectRoadH/opentoggl",
      },
      {
        title: "Documentation",
        value: "Docs and guides",
        body: "Deployment docs, AI notes, and product definitions live in the open.",
        cta: "View docs",
        href: "/docs",
      },
    ],
  },
  faq: [
    {
      question: "Is OpenToggl a drop-in replacement for Toggl Track?",
      answer:
        "OpenToggl targets the current public Toggl surface, including Track API v9, Reports API v3, and Webhooks API v1. Existing integrations that use these APIs should work without changes. The web interface is independently implemented, but the operating surface is intended to match the public definition.",
    },
    {
      question: "Can I migrate my existing Toggl data?",
      answer:
        "Yes. OpenToggl supports importing Toggl export files so your time entry history comes with you when you migrate.",
    },
    {
      question: "What are the self-hosting requirements?",
      answer:
        "OpenToggl requires Docker and Docker Compose. It runs a Go backend and React frontend backed by PostgreSQL. A single compose setup brings up the full stack, and docs cover CasaOS, Synology, and fnOS as well.",
    },
    {
      question: "Is the hosted instance and self-hosted version the same?",
      answer:
        "Yes. The managed instance and self-hosted version run the same product with the same public capability surface. There is no hidden split.",
    },
    {
      question: "Why is OpenToggl described as AI-friendly?",
      answer:
        "Because the product is built around a stable public contract and self-hosting support. That makes it a much better backend for agents, scripts, and automation than a product constrained by someone else's vendor limits.",
    },
  ],
} as const;
