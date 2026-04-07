export const homeContentJa = {
  hero: {
    taglineBefore: "",
    taglineAfter: "な Toggl 代替ツール。",
    rotatingWords: ["無料", "プライベート", "セルフホスト可能", "AI フレンドリー"],
    subtitle: "Toggl API 互換。データは自分の手元に。",
    ctas: {
      tryDemo: "デモを試す",
      selfHost: "セルフホスト",
    },
  },

  features: {
    items: [
      {
        title: "そのまま互換",
        body: "Toggl API と互換。既存のツールや連携はそのまま使えます。",
      },
      {
        title: "数分でデプロイ",
        body: "docker compose コマンド一発。CasaOS、Synology、fnOS にも対応。",
      },
      {
        title: "無料・オープンソース",
        body: "ユーザー数制限なし、料金プランなし。セルフホストもホスト版も同じ製品。",
      },
    ],
  },

  proof: {
    items: [
      {
        title: "ライブデモ",
        value: "track.opentoggl.com",
        body: "まず試して、それから決めてください。",
        cta: "デモを開く",
        href: "https://track.opentoggl.com",
      },
      {
        title: "ソースコード",
        value: "CorrectRoadH/opentoggl",
        body: "コード、Issue、ディスカッション — すべて公開。",
        cta: "GitHub を開く",
        href: "https://github.com/CorrectRoadH/opentoggl",
      },
      {
        title: "ドキュメント",
        value: "ドキュメント & ガイド",
        body: "デプロイ、API リファレンス、プロダクト設計。",
        cta: "ドキュメントを見る",
        href: "/ja/docs",
      },
    ],
  },

  faq: [
    {
      question: "Toggl Track の代わりに使えますか？",
      answer:
        "はい。OpenToggl は Toggl の Track、Reports、Webhooks API と互換性があります。Toggl API 経由で接続しているツールなら、変更なしでそのまま動くはずです。",
    },
    {
      question: "Toggl のデータを移行できますか？",
      answer:
        "はい。Toggl のエクスポートファイルをインポートできます。履歴もそのまま引き継げます。",
    },
    {
      question: "セルフホストに必要なものは？",
      answer:
        "Docker だけです。docker compose up -d でフルスタック（Go バックエンド、React フロントエンド、PostgreSQL）が立ち上がります。Synology、CasaOS、fnOS 向けのガイドもあります。",
    },
    {
      question: "ホスト版とセルフホスト版は同じですか？",
      answer: "はい。同じコード、同じ機能。プレミアムプランも機能制限もありません。",
    },
    {
      question: "なぜ AI フレンドリーなのですか？",
      answer:
        "安定した API、充実したドキュメント、セルフホスト対応。エージェントやスクリプトがサードパーティの制限なしに連携できます。",
    },
  ],
} as const;
