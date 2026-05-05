export const homeContentPt = {
  nameTbd: "OpenTickly",

  hero: {
    taglineBefore: "A alternativa ",
    taglineAfter: " ao Toggl.",
    rotatingWords: ["gratuita", "privada", "auto-hospedada", "amigável à IA"],
    subtitle: "Compatível com a API do Toggl. Seus dados continuam seus.",
    ctas: {
      tryDemo: "Experimente Agora",
      selfHost: "Auto-hospedar",
    },
  },

  features: {
    items: [
      {
        title: "Totalmente compatível",
        body: "Funciona com a API do Toggl. Suas ferramentas e integrações existentes continuam funcionando.",
      },
      {
        title: "Implante em minutos",
        body: "Um comando docker compose. Funciona no CasaOS, Synology, fnOS.",
      },
      {
        title: "Gratuito e open source",
        body: "Sem limite de usuários, sem planos. Auto-hospedado e hospedado são o mesmo produto.",
      },
    ],
  },

  proof: {
    items: [
      {
        title: "Demo ao vivo",
        value: "Demo ao vivo",
        body: "Experimente primeiro, decida depois.",
        cta: "Abrir demo",
        href: "https://track.opentoggl.com",
      },
      {
        title: "Código fonte",
        value: "CorrectRoadH/OpenTickly",
        body: "Código, issues, discussões — tudo aberto.",
        cta: "Abrir GitHub",
        href: "https://github.com/CorrectRoadH/OpenTickly",
      },
      {
        title: "Documentação",
        value: "Docs e guias",
        body: "Implantação, referência da API, design do produto.",
        cta: "Ver documentação",
        href: "/docs",
      },
    ],
  },

  faq: [
    {
      question: "Pode substituir o Toggl Track?",
      answer:
        "Sim. O OpenTickly é compatível com as APIs Track, Reports e Webhooks do Toggl. Se suas ferramentas se comunicam com o Toggl via API, elas devem funcionar com o OpenTickly sem alterações.",
    },
    {
      question: "Posso trazer meus dados do Toggl?",
      answer: "Sim. Você pode importar arquivos de exportação do Toggl — seu histórico vem junto.",
    },
    {
      question: "O que preciso para auto-hospedar?",
      answer:
        "Docker. Um comando docker compose up -d levanta toda a stack (backend em Go, frontend em React, PostgreSQL). Também temos guias para Synology, CasaOS e fnOS.",
    },
    {
      question: "Hospedado e auto-hospedado são iguais?",
      answer:
        "Sim. Mesmo código, mesmos recursos. Sem plano premium, sem restrição de funcionalidades.",
    },
    {
      question: "Por que amigável à IA?",
      answer:
        "API estável, documentação sólida, auto-hospedável. Agentes e scripts podem integrar sem limites de requisição de terceiros atrapalhando.",
    },
  ],
} as const;
