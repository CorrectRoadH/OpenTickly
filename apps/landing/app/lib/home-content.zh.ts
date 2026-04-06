export const homeContentZh = {
  hero: {
    taglineBefore: "",
    taglineAfter: "的 Toggl 替代方案。",
    rotatingWords: ["免费", "私有优先", "可自托管", "AI 友好"],
    subtitle: "同一套 API，同一套工作流，数据在你手里。",
    ctas: {
      tryDemo: "在线演示",
      selfHost: "自托管",
    },
  },

  features: {
    items: [
      {
        title: "直接兼容",
        body: "完全兼容 Toggl，现有集成无需修改。",
      },
      {
        title: "分钟级部署",
        body: "一条 Docker Compose 命令。支持 CasaOS、Synology、fnOS。",
      },
      {
        title: "免费且开源",
        body: "无席位限制，无定价分层。托管版和自托管版完全一致。",
      },
    ],
  },

  proof: {
    items: [
      {
        title: "在线演示",
        value: "track.opentoggl.com",
        body: "先试用真实产品，再决定是否采用。",
        cta: "打开演示",
        href: "https://track.opentoggl.com",
      },
      {
        title: "代码仓库",
        value: "CorrectRoadH/opentoggl",
        body: "直接读代码、看 issue，全部公开。",
        cta: "打开 GitHub",
        href: "https://github.com/CorrectRoadH/opentoggl",
      },
      {
        title: "文档",
        value: "文档与指南",
        body: "部署指南、API 参考、产品定义。",
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
