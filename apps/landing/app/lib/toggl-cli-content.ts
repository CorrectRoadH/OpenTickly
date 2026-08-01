export const togglCliRepoUrl = "https://github.com/CorrectRoadH/toggl-cli";

export const togglCliInstallCommands = {
  agent: "npx skills add CorrectRoadH/toggl-cli",
  cli: "npm install -g @correctroadh/toggl-cli",
} as const;

export const togglCliFeatures = [
  {
    title: "Track time",
    body: "Start, stop, and inspect the current timer without leaving your terminal or agent session.",
  },
  {
    title: "Browse entries",
    body: "List recent entries or query precise local-time date ranges for reviews and automation.",
  },
  {
    title: "Manage work",
    body: "Create and use projects, tasks, and tags from the same predictable command surface.",
  },
  {
    title: "Run reports",
    body: "Generate summary, detailed, and weekly reports for any date range from the command line.",
  },
  {
    title: "Choose your backend",
    body: "Use official Toggl Track today and point the same workflow at self-hosted OpenToggl tomorrow.",
  },
  {
    title: "Stay fast and secure",
    body: "Local HTTP caching cuts repeated reads, while credentials live in your operating system keychain.",
  },
] as const;

export const togglCliCommands = {
  entry: ["toggl entry start", "toggl entry stop", "toggl entry current", "toggl entry list"],
  resources: ["toggl project create", "toggl task create", "toggl tag create"],
  reports: ["toggl report summary", "toggl report detailed", "toggl report weekly"],
} as const;

export const togglCliWorkflowExamples = [
  {
    label: "Track",
    lines: [
      'toggl entry start -d "Ship the landing page" -p OpenToggl -t dev cli',
      "toggl entry current",
      "toggl entry stop",
    ],
  },
  {
    label: "Organize",
    lines: [
      'toggl project create "OpenToggl"',
      'toggl task create --project OpenToggl "Code review"',
      'toggl tag create "deep-work"',
    ],
  },
  {
    label: "Report",
    lines: [
      "toggl report summary --since 2026-03-01 --until 2026-03-31",
      "toggl report detailed --since 2026-03-01 --until 2026-03-31",
      "toggl report weekly --since 2026-03-17 --until 2026-03-23",
    ],
  },
] as const;

export const togglCliFaq = [
  {
    question: "Does toggl-cli work with official Toggl Track?",
    answer:
      "Yes. Authenticate with your Toggl API token and use the CLI against the official Toggl Track service.",
  },
  {
    question: "Can it connect to a self-hosted OpenToggl instance?",
    answer:
      "Yes. Pass --api-type opentoggl and your instance's /api/v9 URL during authentication. The commands stay the same.",
  },
  {
    question: "Why is it useful for AI agents?",
    answer:
      "It ships as an installable agent skill and exposes daily time tracking through a consistent CLI, so agents can discover and execute workflows without a browser.",
  },
  {
    question: "Where is my API token stored?",
    answer:
      "Interactive authentication stores the token in your operating system keychain. Linux environments without persistent keyring storage can use TOGGL_API_TOKEN instead.",
  },
] as const;

export function buildTogglCliSchema(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "toggl-cli",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Linux, macOS, Windows",
    description:
      "A full-featured, agent-friendly command-line interface for Toggl Track and OpenToggl.",
    url: `${siteUrl}/toggl-cli`,
    codeRepository: togglCliRepoUrl,
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    featureList: togglCliFeatures.map((feature) => feature.title),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}
