export const homeContentEn = {
  nameTbd: "OpenTickly",

  hero: {
    taglineBefore: "The ",
    taglineAfter: " Toggl alternative.",
    rotatingWords: ["free", "private", "self-hosted", "AI-friendly"],
    subtitle: "Compatible with the Toggl API. Your data stays yours.",
    ctas: {
      tryDemo: "Try It Live",
      selfHost: "Self-Host",
    },
  },

  features: {
    items: [
      {
        title: "Drop-in compatible",
        body: "Works with the Toggl API. Your existing tools and integrations carry over.",
      },
      {
        title: "Deploy in minutes",
        body: "One docker compose command. Runs on CasaOS, Synology, fnOS.",
      },
      {
        title: "Free & open source",
        body: "No seat limits, no tiers. Self-hosted and hosted are the same product.",
      },
    ],
  },

  proof: {
    items: [
      {
        title: "Live demo",
        value: "Live demo",
        body: "Try it first, decide later.",
        cta: "Open demo",
        href: "https://track.opentoggl.com",
      },
      {
        title: "Source code",
        value: "CorrectRoadH/OpenTickly",
        body: "Code, issues, discussions — all in the open.",
        cta: "Open GitHub",
        href: "https://github.com/CorrectRoadH/OpenTickly",
      },
      {
        title: "Docs",
        value: "Docs & guides",
        body: "Deployment, API reference, product design.",
        cta: "View docs",
        href: "/docs",
      },
    ],
  },

  faq: [
    {
      question: "Can it replace Toggl Track?",
      answer:
        "Yes. OpenTickly is compatible with Toggl's Track, Reports, and Webhooks APIs. If your tools talk to Toggl via its API, they should work with OpenTickly without changes.",
    },
    {
      question: "Can I bring my Toggl data?",
      answer: "Yes. You can import Toggl export files — your history comes with you.",
    },
    {
      question: "What do I need to self-host?",
      answer:
        "Docker. One docker compose up -d brings up the full stack (Go backend, React frontend, PostgreSQL). We also have guides for Synology, CasaOS, and fnOS.",
    },
    {
      question: "Are hosted and self-hosted the same?",
      answer: "Yes. Same code, same features. No premium tier, no feature gating.",
    },
    {
      question: "Why AI-friendly?",
      answer:
        "Stable API, solid docs, self-hostable. Agents and scripts can integrate without third-party rate limits getting in the way.",
    },
  ],
} as const;
