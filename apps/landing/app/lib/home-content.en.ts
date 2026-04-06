export const homeContentEn = {
  hero: {
    taglineBefore: "The ",
    taglineAfter: " Toggl alternative.",
    rotatingWords: ["free", "private", "self-hosted", "AI-friendly"],
    subtitle: "Same API. Same workflow. Your data.",
    ctas: {
      tryDemo: "Try Demo",
      selfHost: "Self-Host",
    },
  },

  features: {
    items: [
      {
        title: "Drop-in compatible",
        body: "Fully compatible with Toggl. Existing integrations just work.",
      },
      {
        title: "Self-host in minutes",
        body: "One Docker Compose command. Runs on CasaOS, Synology, fnOS.",
      },
      {
        title: "Free & open source",
        body: "No seat limits. No pricing tiers. Same product hosted or self-hosted.",
      },
    ],
  },

  proof: {
    items: [
      {
        title: "Live demo",
        value: "track.opentoggl.com",
        body: "Try the real product before you commit.",
        cta: "Open demo",
        href: "https://track.opentoggl.com",
      },
      {
        title: "Repository",
        value: "CorrectRoadH/opentoggl",
        body: "Read the code, follow issues, inspect everything.",
        cta: "Open GitHub",
        href: "https://github.com/CorrectRoadH/opentoggl",
      },
      {
        title: "Documentation",
        value: "Docs & guides",
        body: "Deployment, API reference, and product definitions.",
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
