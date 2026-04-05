export const homeContentZh = {
  hero: {
    eyebrow: "免费、Private-First 的 Toggl 替代方案",
    title: "OpenToggl 保留 Toggl 工作流，但不再被厂商锁定。",
    body: "OpenToggl 是一个免费、private-first、AI-friendly 的 Toggl 替代方案。它直接以 Toggl 当前公开产品面为实现目标，提供配套 Web 界面，支持 self-host，同时保留公开在线 demo。",
    ctas: {
      liveDemo: "在线演示",
      github: "GitHub",
      selfHosting: "自托管指南",
    },
  },

  whatIs: {
    title: "OpenToggl 是什么",
    description:
      "OpenToggl 不是一个“受 Toggl 启发”的时间追踪器，它直接把 Toggl 当前公开产品面作为实现目标。",
    items: [
      {
        title: "合约优先",
        body: "产品文档、OpenAPI 和 Web 界面共同定义产品，实现漂移时修代码。",
      },
      {
        title: "不是部分兼容",
        body: "目标是真实覆盖公开产品面，不是模糊的“基本兼容”。",
      },
      {
        title: "范围保持克制",
        body: "除了导入和实例管理，不再发明另一套偏离 Toggl 的业务模型。",
      },
    ],
  },

  capability: {
    title: "兼容目标",
    description:
      "重点不是 feature checklist，而是让从 Toggl 迁移过来的团队继续用同一套工作流、脚本和心智模型。",
    items: [
      {
        title: "时间追踪",
        body: "时间条目、项目、客户、标签、任务，以及对应的操作流。",
      },
      {
        title: "报表",
        body: "汇总、详细和周报，保持同一公开产品面。",
      },
      {
        title: "Webhook",
        body: "继续使用 webhook 流程，不需要围绕新工具重写集成。",
      },
    ],
  },

  why: {
    title: "为什么切换",
    description: "核心原因是对成本、数据和自动化的控制权。",
    items: [
      {
        title: "价格压力",
        body: "对很多个人和团队来说，官方 Toggl 定价就是切换的主要原因。",
      },
      {
        title: "Private-first 数据控制",
        body: "把时间数据放在你自己的 PostgreSQL 和基础设施中。",
      },
      {
        title: "更适合自动化",
        body: "AI agent 和脚本需要稳定吞吐，而不是受制于厂商限额。",
      },
      {
        title: "移动端 PWA",
        body: "可添加到主屏幕，像 App 一样用，不需要应用商店。",
      },
    ],
  },

  selfHost: {
    title: "为什么 self-host",
    description: "自托管应该是一条有文档、有入口的路径，而不是缺功能的另一档产品。",
    items: [
      {
        title: "掌控部署节奏",
        body: "你决定部署在哪里，以及什么时候升级。",
      },
      {
        title: "没有隐藏分层",
        body: "托管产品和自托管安装包是同一套产品。",
      },
      {
        title: "运行手册清晰",
        body: "Docker Compose、CasaOS、Synology 和 fnOS 都有明确指南。",
      },
    ],
  },

  proof: {
    title: "开源证据",
    description: "在线 demo、文档和仓库都公开可见，你可以自己验证。",
    items: [
      {
        title: "在线演示",
        value: "track.opentoggl.com",
        body: "先打开托管实例，看真实产品，再决定是否继续投入。",
        cta: "打开演示",
        href: "https://track.opentoggl.com",
      },
      {
        title: "代码仓库",
        value: "CorrectRoadH/opentoggl",
        body: "直接读代码、看 issue，并检查自托管实现是否公开完整。",
        cta: "打开 GitHub",
        href: "https://github.com/CorrectRoadH/opentoggl",
      },
      {
        title: "文档",
        value: "文档与指南",
        body: "部署说明、AI 说明和产品定义都在公开维护。",
        cta: "查看文档",
        href: "/zh/docs",
      },
    ],
  },
  faq: [
    {
      question: "OpenToggl 是 Toggl Track 的直接替代品吗？",
      answer:
        "OpenToggl 直接以 Toggl 当前公开产品面为实现目标，包括 Track API v9、Reports API v3 和 Webhooks API v1。使用这些公开 API 的现有集成通常不需要修改。Web 界面是独立实现的，但操作面以公开定义为准。",
    },
    {
      question: "我能迁移现有的 Toggl 数据吗？",
      answer: "可以。OpenToggl 支持导入 Toggl 导出文件，因此迁移时可以保留你的时间条目历史。",
    },
    {
      question: "自托管需要什么条件？",
      answer:
        "OpenToggl 需要 Docker 和 Docker Compose。它运行 Go 后端和 React 前端，底层是 PostgreSQL。单个 compose 配置就能拉起完整技术栈，文档也覆盖了 CasaOS、Synology 和 fnOS。",
    },
    {
      question: "托管版本和自托管版本一样吗？",
      answer: "是的。托管实例和自托管版本运行同一套产品，公开能力范围一致，没有隐藏功能差异。",
    },
    {
      question: "为什么说 OpenToggl 对 AI 友好？",
      answer:
        "因为它围绕稳定的公开合约和自托管能力构建。这让它比受制于厂商限额的闭源产品更适合作为 agent、脚本和自动化的后端。",
    },
  ],
} as const;
