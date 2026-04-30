export const homeContentKo = {
  notice: {
    title: "중요 공지",
    body: "상표 관련 이의 제기로 인해 저희 GitHub 저장소가 내려졌습니다. Toggl 에 영향을 주지 않도록 가능한 한 빨리 프로젝트 이름을 변경하겠습니다. 이것은 전적으로 제 자신의 무지 때문입니다. 저희는 Toggl 을 정말 좋아하며, 훌륭한 제품이라고 생각합니다. 혼란을 드려 죄송하며, 이해해 주셔서 감사합니다.",
  },

  nameTbd: "OpenTickly",

  hero: {
    taglineBefore: "",
    taglineAfter: " Toggl 대안.",
    rotatingWords: ["무료", "프라이빗", "셀프호스팅", "AI 친화적"],
    subtitle: "Toggl API 호환. 데이터는 내 손에.",
    ctas: {
      tryDemo: "데모 체험",
      selfHost: "셀프호스팅",
    },
  },

  features: {
    items: [
      {
        title: "바로 호환",
        body: "Toggl API와 호환됩니다. 기존 도구와 연동이 그대로 동작합니다.",
      },
      {
        title: "몇 분이면 배포",
        body: "docker compose 명령어 하나면 끝. CasaOS, Synology, fnOS에서도 실행 가능.",
      },
      {
        title: "무료 오픈소스",
        body: "인원 제한 없음, 요금제 없음. 셀프호스팅과 호스팅 버전은 동일한 제품.",
      },
    ],
  },

  proof: {
    items: [
      {
        title: "라이브 데모",
        value: "라이브 데모",
        body: "먼저 써보고 결정하세요.",
        cta: "데모 열기",
        href: "https://track.opentoggl.com",
      },
      {
        title: "소스코드",
        value: "CorrectRoadH/OpenTickly",
        body: "코드, 이슈, 토론 — 모두 공개.",
        cta: "GitHub 열기",
        href: "https://github.com/CorrectRoadH/OpenTickly",
      },
      {
        title: "문서",
        value: "문서 & 가이드",
        body: "배포, API 레퍼런스, 제품 설계.",
        cta: "문서 보기",
        href: "/ko/docs",
      },
    ],
  },

  faq: [
    {
      question: "Toggl Track을 대체할 수 있나요?",
      answer:
        "네. OpenTickly은 Toggl의 Track, Reports, Webhooks API와 호환됩니다. Toggl API로 연동하는 도구라면 수정 없이 그대로 사용할 수 있습니다.",
    },
    {
      question: "Toggl 데이터를 가져올 수 있나요?",
      answer: "네. Toggl 내보내기 파일을 가져올 수 있습니다. 기록이 그대로 따라옵니다.",
    },
    {
      question: "셀프호스팅에 뭐가 필요하나요?",
      answer:
        "Docker만 있으면 됩니다. docker compose up -d 하나로 전체 스택(Go 백엔드, React 프론트엔드, PostgreSQL)이 실행됩니다. Synology, CasaOS, fnOS 가이드도 있습니다.",
    },
    {
      question: "호스팅 버전과 셀프호스팅 버전이 같은 건가요?",
      answer: "네. 같은 코드, 같은 기능. 프리미엄 플랜도, 기능 제한도 없습니다.",
    },
    {
      question: "왜 AI 친화적인가요?",
      answer:
        "안정적인 API, 충실한 문서, 셀프호스팅 지원. 에이전트와 스크립트가 서드파티 제한 없이 연동할 수 있습니다.",
    },
  ],
} as const;
