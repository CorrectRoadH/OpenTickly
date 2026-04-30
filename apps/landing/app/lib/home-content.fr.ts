export const homeContentFr = {
  notice: {
    title: "Avis important",
    body: "Notre dépôt GitHub a été retiré suite à une plainte relative à une marque. Nous renommerons ce projet dès que possible afin de ne pas nuire à Toggl. C'est entièrement dû à ma propre ignorance. Nous adorons sincèrement Toggl — c'est un excellent produit, et nous sommes désolés pour la confusion. Merci de votre compréhension.",
  },

  nameTbd: "OpenTickly",

  hero: {
    taglineBefore: "L'alternative Toggl ",
    taglineAfter: ".",
    rotatingWords: ["gratuite", "privée", "auto-hébergeable", "compatible IA"],
    subtitle: "Compatible avec l'API Toggl. Vos données restent les vôtres.",
    ctas: {
      tryDemo: "Essayer la démo",
      selfHost: "Auto-héberger",
    },
  },

  features: {
    items: [
      {
        title: "Compatible directement",
        body: "Fonctionne avec l'API Toggl. Vos outils et intégrations existants fonctionnent tels quels.",
      },
      {
        title: "Déployez en minutes",
        body: "Une seule commande docker compose. Tourne sur CasaOS, Synology, fnOS.",
      },
      {
        title: "Gratuit et open source",
        body: "Pas de limite d'utilisateurs, pas de plans payants. Auto-hébergé et hébergé, c'est le même produit.",
      },
    ],
  },

  proof: {
    items: [
      {
        title: "Démo en ligne",
        value: "Démo en ligne",
        body: "Essayez d'abord, décidez ensuite.",
        cta: "Ouvrir la démo",
        href: "https://track.opentoggl.com",
      },
      {
        title: "Code source",
        value: "CorrectRoadH/OpenTickly",
        body: "Code, issues, discussions — tout est ouvert.",
        cta: "Ouvrir GitHub",
        href: "https://github.com/CorrectRoadH/OpenTickly",
      },
      {
        title: "Documentation",
        value: "Docs et guides",
        body: "Déploiement, référence API, conception produit.",
        cta: "Voir les docs",
        href: "/fr/docs",
      },
    ],
  },

  faq: [
    {
      question: "Peut-il remplacer Toggl Track ?",
      answer:
        "Oui. OpenTickly est compatible avec les APIs Track, Reports et Webhooks de Toggl. Si vos outils se connectent à Toggl via son API, ils devraient fonctionner avec OpenTickly sans modification.",
    },
    {
      question: "Puis-je importer mes données Toggl ?",
      answer: "Oui. Vous pouvez importer les fichiers d'export Toggl — votre historique vous suit.",
    },
    {
      question: "Que faut-il pour auto-héberger ?",
      answer:
        "Docker. Un docker compose up -d lance toute la stack (backend Go, frontend React, PostgreSQL). Il y a aussi des guides pour Synology, CasaOS et fnOS.",
    },
    {
      question: "La version hébergée et auto-hébergée sont identiques ?",
      answer:
        "Oui. Même code, mêmes fonctionnalités. Pas de plan premium, pas de fonctions bloquées.",
    },
    {
      question: "Pourquoi compatible IA ?",
      answer:
        "API stable, documentation solide, auto-hébergeable. Les agents et scripts s'intègrent sans limites imposées par un tiers.",
    },
  ],
} as const;
