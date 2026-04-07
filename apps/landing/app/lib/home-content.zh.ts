export const homeContentZh = {
  hero: {
    taglineBefore: "",
    taglineAfter: "的 Toggl 替代方案。",
    rotatingWords: ["免费", "数据私有", "可自托管", "AI 友好"],
    subtitle: "兼容 Toggl API，数据完全由你掌控。",
    ctas: {
      tryDemo: "在线试用",
      selfHost: "自托管部署",
    },
  },

  features: {
    items: [
      {
        title: "直接兼容",
        body: "兼容 Toggl API，现有工具和集成无需改动。",
      },
      {
        title: "几分钟部署",
        body: "一条 docker compose 命令搞定。CasaOS、群晖、飞牛都能跑。",
      },
      {
        title: "免费开源",
        body: "不限人数，不分版本。自托管和托管版功能完全一样。",
      },
    ],
  },

  proof: {
    items: [
      {
        title: "在线演示",
        value: "track.opentoggl.com",
        body: "先用起来，好不好自己判断。",
        cta: "打开演示",
        href: "https://track.opentoggl.com",
      },
      {
        title: "源码",
        value: "CorrectRoadH/opentoggl",
        body: "代码、issue、讨论，全部公开。",
        cta: "打开 GitHub",
        href: "https://github.com/CorrectRoadH/opentoggl",
      },
      {
        title: "文档",
        value: "文档与指南",
        body: "部署、API、产品设计，都在这里。",
        cta: "查看文档",
        href: "/zh/docs",
      },
    ],
  },

  faq: [
    {
      question: "能直接替代 Toggl Track 吗？",
      answer:
        "能。OpenToggl 兼容 Toggl 的 Track、Reports 和 Webhooks API。如果你现在用的工具是通过 Toggl API 对接的，切过来基本不用改。",
    },
    {
      question: "能把 Toggl 的数据迁移过来吗？",
      answer: "能。支持导入 Toggl 导出文件，历史记录不会丢。",
    },
    {
      question: "自托管需要什么？",
      answer:
        "装好 Docker 就行。一个 docker compose up -d 拉起整套服务（Go 后端 + React 前端 + PostgreSQL）。群晖、CasaOS、飞牛也有部署指南。",
    },
    {
      question: "托管版和自托管版有区别吗？",
      answer: "没有。同一套代码，同一套功能，不搞区别对待。",
    },
    {
      question: "为什么说对 AI 友好？",
      answer: "API 稳定、文档齐全、可以自己部署。用 agent 或脚本对接不受第三方限制。",
    },
  ],
} as const;
