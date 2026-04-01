export const homeContent = {
  en: {
    hero: {
      eyebrow: "Open Source Time Tracking",
      title: "The self-hosted Toggl you actually control",
      body: "OpenToggl is an open source time tracking platform that covers Track API v9, Reports API v3, and Webhooks API v1 — with the matching web interface and full self-hosting support.",
      ctas: {
        liveDemo: "Live Demo",
        github: "GitHub",
        selfHosting: "Self-Hosting Guide",
      },
      highlights: [
        {
          title: "Toggl API-compatible",
          body: "Covers Track API v9, Reports API v3, and Webhooks API v1. Existing Toggl integrations and automations work without changes.",
        },
        {
          title: "Fully self-hosted",
          body: "Run it on your own infrastructure. Docker Compose, CasaOS, Synology, and fnOS are all supported out of the box.",
        },
        {
          title: "Open source",
          body: "The full source is on GitHub. No hidden split between the SaaS version and self-hosted capability surface.",
        },
      ],
    },

    whatIs: {
      title: "What is OpenToggl",
      description:
        "OpenToggl takes the current public Toggl surface as its implementation target — not a vague approximation, but an explicit contract match.",
      items: [
        {
          title: "Contract-first implementation",
          body: "Product definitions, OpenAPI contracts, and the web surface are the single source of truth. Code that drifts from docs gets fixed in code.",
        },
        {
          title: "No API-only shortcut",
          body: "The first release ships both the API and the matching web interface. There is no first-class API tier with a second-class UI.",
        },
        {
          title: "Import from Toggl",
          body: "Migrate your existing data by importing Toggl export files. Your history comes with you.",
        },
      ],
    },

    capability: {
      title: "What it covers",
      description:
        "The first formal scope targets the full operational surface of Toggl Track — time tracking, reporting, webhooks, and workspace management.",
      items: [
        {
          title: "Time tracking",
          body: "Create, manage, and report on time entries through the full Track API v9 surface, including projects, clients, tags, and tasks.",
        },
        {
          title: "Reports",
          body: "Summary, detailed, and weekly reports via Reports API v3. The same data your dashboards and automations already expect.",
        },
        {
          title: "Webhooks",
          body: "Webhook lifecycle management and delivery through Webhooks API v1. Connect your existing tooling without rewiring integrations.",
        },
      ],
    },

    selfHost: {
      title: "Deploy anywhere",
      description:
        "OpenToggl is designed to run on the hardware and platforms you already have. Pick the deployment shape that fits your setup.",
      items: [
        {
          title: "Docker Compose",
          body: "The canonical self-hosting path. A single compose file brings up the full stack with a PostgreSQL backend and the web UI.",
        },
        {
          title: "Home lab platforms",
          body: "First-class support for CasaOS, Synology, and fnOS. Install directly from their app stores with a guided setup.",
        },
        {
          title: "Hosted option",
          body: "Not ready to self-host? Use the managed instance at track.opentoggl.com and migrate to self-hosted whenever you want.",
        },
      ],
    },

    why: {
      title: "Why OpenToggl",
      description:
        "Time tracking tools should be concrete and auditable, not approximate and vendor-locked.",
      items: [
        {
          title: "No vendor lock-in",
          body: "Your data lives in your own PostgreSQL database. Export or migrate at any time.",
        },
        {
          title: "No hidden splits",
          body: "Hosted and self-hosted instances run identical code with the same capability surface.",
        },
        {
          title: "Automation-friendly",
          body: "A stable, documented API contract means your scripts and integrations stay working across versions.",
        },
        {
          title: "Transparent roadmap",
          body: "Scope is defined in public docs and OpenAPI contracts. No surprises about what is and isn't in the product.",
        },
      ],
    },

    proof: {
      title: "Get started",
      description: "Try the live demo, read the docs, or deploy your own instance today.",
      items: [
        {
          title: "Live demo",
          value: "Try it now",
          body: "Explore the full product surface on the hosted instance. No account required.",
          cta: "Open demo",
          href: "https://track.opentoggl.com",
        },
        {
          title: "Documentation",
          value: "Read the docs",
          body: "Self-hosting guides, API surface overview, and AI integration walkthroughs.",
          cta: "View docs",
          href: "/docs",
        },
        {
          title: "Source code",
          value: "Star on GitHub",
          body: "Browse the full source, open issues, and follow development on GitHub.",
          cta: "Open GitHub",
          href: "https://github.com/CorrectRoadH/opentoggl",
        },
      ],
    },

    faq: [
      {
        question: "Is OpenToggl a drop-in replacement for Toggl Track?",
        answer:
          "OpenToggl targets API compatibility with Toggl Track API v9, Reports API v3, and Webhooks API v1. Existing integrations that use these APIs should work without changes. It is not a feature-for-feature UI clone — the web interface covers the same operations but is implemented independently.",
      },
      {
        question: "Can I migrate my existing Toggl data?",
        answer:
          "Yes. OpenToggl supports importing Toggl export files so your existing time entry history comes with you when you migrate.",
      },
      {
        question: "What are the self-hosting requirements?",
        answer:
          "OpenToggl requires Docker and Docker Compose. It runs a Go backend and a React frontend backed by PostgreSQL. A single compose file brings up the full stack. Guides for CasaOS, Synology, and fnOS are available in the documentation.",
      },
      {
        question: "Is the hosted instance and self-hosted version the same?",
        answer:
          "Yes. There is no hidden split between the managed instance at track.opentoggl.com and the self-hosted version. Both run identical code with the same capability surface.",
      },
      {
        question: "How does OpenToggl handle AI integrations?",
        answer:
          "OpenToggl's AI story is contract clarity and automation friendliness. The stable API surface means AI agents and automation tools can interact reliably with the API. See the AI integration docs for details on using it with toggl-cli and agent workflows.",
      },
    ],
  },

  zh: {
    hero: {
      eyebrow: "开源时间追踪",
      title: "真正属于你的自托管 Toggl",
      body: "OpenToggl 是一个开源时间追踪平台，覆盖 Track API v9、Reports API v3 和 Webhooks API v1，并提供配套的 Web 界面与完整的自托管支持。",
      ctas: {
        liveDemo: "在线演示",
        github: "GitHub",
        selfHosting: "自托管指南",
      },
      highlights: [
        {
          title: "兼容 Toggl API",
          body: "覆盖 Track API v9、Reports API v3 和 Webhooks API v1。现有的 Toggl 集成和自动化脚本无需修改即可使用。",
        },
        {
          title: "完整自托管",
          body: "在你自己的基础设施上运行。原生支持 Docker Compose、CasaOS、Synology 和 fnOS，开箱即用。",
        },
        {
          title: "完全开源",
          body: "全部源码公开在 GitHub。SaaS 版本与自托管版本没有任何隐性功能差异。",
        },
      ],
    },

    whatIs: {
      title: "OpenToggl 是什么",
      description:
        "OpenToggl 以 Toggl 当前的公开接口作为实现目标——不是模糊的近似，而是精确的合约匹配。",
      items: [
        {
          title: "合约优先的实现",
          body: "产品定义、OpenAPI 合约和 Web 界面是唯一的事实来源。与文档偏离的代码需要在代码层面修正。",
        },
        {
          title: "不走仅 API 的捷径",
          body: "首次发布同时提供 API 和配套的 Web 界面。不存在一流 API 搭配二流 UI 的情况。",
        },
        {
          title: "从 Toggl 导入数据",
          body: "通过导入 Toggl 导出文件迁移现有数据，历史记录完整保留。",
        },
      ],
    },

    capability: {
      title: "覆盖范围",
      description:
        "首个正式范围覆盖 Toggl Track 的完整操作面——时间追踪、报表、Webhook 和工作区管理。",
      items: [
        {
          title: "时间追踪",
          body: "通过完整的 Track API v9 接口创建、管理和统计时间条目，包括项目、客户、标签和任务。",
        },
        {
          title: "报表",
          body: "通过 Reports API v3 生成汇总报表、详细报表和周报。与你现有的仪表盘和自动化脚本完全兼容。",
        },
        {
          title: "Webhook",
          body: "通过 Webhooks API v1 管理 Webhook 生命周期和投递。无需重新接入即可连接现有工具链。",
        },
      ],
    },

    selfHost: {
      title: "随处部署",
      description: "OpenToggl 设计为在你已有的硬件和平台上运行。选择适合你环境的部署方式。",
      items: [
        {
          title: "Docker Compose",
          body: "标准自托管路径。单个 compose 文件即可启动完整的技术栈，包括 PostgreSQL 后端和 Web UI。",
        },
        {
          title: "家庭实验室平台",
          body: "原生支持 CasaOS、Synology 和 fnOS。可直接从各平台的应用商店安装，并提供向导式配置。",
        },
        {
          title: "托管选项",
          body: "还没准备好自托管？使用 track.opentoggl.com 的托管实例，随时可迁移到自托管。",
        },
      ],
    },

    why: {
      title: "为什么选择 OpenToggl",
      description: "时间追踪工具应该具体、可审计，而不是模糊、被厂商锁定。",
      items: [
        {
          title: "无厂商锁定",
          body: "数据存储在你自己的 PostgreSQL 数据库中，随时可导出或迁移。",
        },
        {
          title: "无隐性差异",
          body: "托管实例与自托管版本运行完全相同的代码，功能范围一致。",
        },
        {
          title: "对自动化友好",
          body: "稳定、有文档的 API 合约意味着你的脚本和集成在版本迭代中持续可用。",
        },
        {
          title: "透明的路线图",
          body: "范围在公开文档和 OpenAPI 合约中定义，产品边界清晰，没有意外。",
        },
      ],
    },

    proof: {
      title: "立即开始",
      description: "试用在线演示、阅读文档，或今天就部署你自己的实例。",
      items: [
        {
          title: "在线演示",
          value: "立即体验",
          body: "在托管实例上探索完整的产品功能，无需注册账号。",
          cta: "打开演示",
          href: "https://track.opentoggl.com",
        },
        {
          title: "文档",
          value: "阅读文档",
          body: "包含自托管指南、API 接口概览和 AI 集成教程。",
          cta: "查看文档",
          href: "/zh/docs",
        },
        {
          title: "源代码",
          value: "在 GitHub 上 Star",
          body: "浏览完整源码、提交 Issue，并在 GitHub 上关注项目进展。",
          cta: "打开 GitHub",
          href: "https://github.com/CorrectRoadH/opentoggl",
        },
      ],
    },

    faq: [
      {
        question: "OpenToggl 是 Toggl Track 的直接替代品吗？",
        answer:
          "OpenToggl 的目标是与 Toggl Track API v9、Reports API v3 和 Webhooks API v1 保持 API 兼容性。使用这些 API 的现有集成无需修改即可使用。它不是功能对功能的 UI 克隆——Web 界面覆盖相同的操作，但独立实现。",
      },
      {
        question: "我能迁移现有的 Toggl 数据吗？",
        answer: "可以。OpenToggl 支持导入 Toggl 导出文件，迁移时你的历史时间条目记录可以完整保留。",
      },
      {
        question: "自托管的运行要求是什么？",
        answer:
          "OpenToggl 需要 Docker 和 Docker Compose。它运行一个 Go 后端和 React 前端，以 PostgreSQL 作为数据存储。单个 compose 文件即可启动完整的技术栈。文档中提供了 CasaOS、Synology 和 fnOS 的安装指南。",
      },
      {
        question: "托管实例和自托管版本是一样的吗？",
        answer:
          "是的。track.opentoggl.com 的托管实例与自托管版本之间没有隐性差异，两者运行完全相同的代码，功能范围一致。",
      },
      {
        question: "OpenToggl 如何支持 AI 集成？",
        answer:
          "OpenToggl 的 AI 故事是合约清晰和对自动化友好。稳定的 API 接口让 AI Agent 和自动化工具可以可靠地与 API 交互。关于与 toggl-cli 和 Agent 工作流配合使用的详情，请参阅 AI 集成文档。",
      },
    ],
  },
} as const;
