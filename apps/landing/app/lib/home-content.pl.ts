export const homeContentPl = {
  notice: {
    title: "Ważne ogłoszenie",
    body: "Nasze repozytorium GitHub zostało usunięte po skardze dotyczącej znaku towarowego. Zmienimy nazwę projektu tak szybko, jak to możliwe, aby nie wpływać na Toggl. To wyłącznie moja własna niewiedza. Naprawdę lubimy Toggl — to świetny produkt, i przepraszamy za wszelkie nieporozumienia. Dziękujemy za wyrozumiałość.",
  },

  nameTbd: "OpenTickly",

  hero: {
    taglineBefore: "The ",
    taglineAfter: " Toggl alternative.",
    rotatingWords: ["darmowa", "prywatna", "samodzielnie hostowana", "przyjazna AI"],
    subtitle: "Kompatybilna z API Toggl. Twoje dane pozostają Twoje.",
    ctas: {
      tryDemo: "Wypróbuj na żywo",
      selfHost: "Hostuj samodzielnie",
    },
  },

  features: {
    items: [
      {
        title: "W pełni kompatybilna",
        body: "Działa z API Toggl. Twoje istniejące narzędzia i integracje działają dalej.",
      },
      {
        title: "Wdrożenie w minuty",
        body: "Jedna komenda docker compose. Działa na CasaOS, Synology, fnOS.",
      },
      {
        title: "Darmowa i open source",
        body: "Bez limitów stanowisk, bez poziomów. Wersja samodzielna i hostowana to ten sam produkt.",
      },
    ],
  },

  proof: {
    items: [
      {
        title: "Demo na żywo",
        value: "track.opentoggl.com",
        body: "Najpierw wypróbuj, zdecyduj później.",
        cta: "Otwórz demo",
        href: "https://track.opentoggl.com",
      },
      {
        title: "Kod źródłowy",
        value: "CorrectRoadH/OpenTickly",
        body: "Kod, zgłoszenia, dyskusje — wszystko otwarcie.",
        cta: "Otwórz GitHub",
        href: "https://github.com/CorrectRoadH/OpenTickly",
      },
      {
        title: "Dokumentacja",
        value: "Dokumentacja i przewodniki",
        body: "Wdrożenie, dokumentacja API, projektowanie produktu.",
        cta: "Zobacz dokumentację",
        href: "/docs",
      },
    ],
  },

  faq: [
    {
      question: "Czy może zastąpić Toggl Track?",
      answer:
        "Tak. OpenTickly jest kompatybilny z API Toggl Track, Reports i Webhooks. Jeśli Twoje narzędzia komunikują się z Toggl przez API, powinny działać z OpenTickly bez zmian.",
    },
    {
      question: "Czy mogę przenieść swoje dane z Toggl?",
      answer:
        "Tak. Możesz zaimportować pliki eksportu Toggl — Twoja historia przenosi się razem z Tobą.",
    },
    {
      question: "Czego potrzebuję do samodzielnego hostingu?",
      answer:
        "Docker. Jedna komenda docker compose up -d uruchamia cały stos (backend Go, frontend React, PostgreSQL). Mamy też przewodniki dla Synology, CasaOS i fnOS.",
    },
    {
      question: "Czy wersja hostowana i samodzielna są takie same?",
      answer: "Tak. Ten sam kod, te same funkcje. Bez poziomu premium, bez blokowania funkcji.",
    },
    {
      question: "Dlaczego przyjazna AI?",
      answer:
        "Stabilne API, solidna dokumentacja, możliwość samodzielnego hostingu. Agenci i skrypty mogą się integrować bez przeszkód ze strony zewnętrznych limitów żądań.",
    },
  ],
} as const;
