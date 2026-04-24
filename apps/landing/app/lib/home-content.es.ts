export const homeContentEs = {
  notice: {
    title: "Aviso importante",
    body: "Nuestro repositorio de GitHub fue retirado tras una reclamación de marca registrada. Cambiaremos el nombre del proyecto lo antes posible para no afectar a Toggl. Esto fue enteramente por mi propia ignorancia. Queremos mucho a Toggl: es un gran producto, y lamentamos cualquier confusión. Gracias por su comprensión.",
  },

  nameTbd: "OpenTickly",

  hero: {
    taglineBefore: "La alternativa a Toggl ",
    taglineAfter: ".",
    rotatingWords: ["gratuita", "privada", "autoalojable", "amigable con IA"],
    subtitle: "Compatible con la API de Toggl. Tus datos son tuyos.",
    ctas: {
      tryDemo: "Probar demo",
      selfHost: "Autoalojar",
    },
  },

  features: {
    items: [
      {
        title: "Compatible directo",
        body: "Funciona con la API de Toggl. Tus herramientas e integraciones existentes siguen funcionando.",
      },
      {
        title: "Despliega en minutos",
        body: "Un solo comando de docker compose. Corre en CasaOS, Synology, fnOS.",
      },
      {
        title: "Gratis y open source",
        body: "Sin límite de usuarios, sin planes de pago. Autoalojado y alojado son el mismo producto.",
      },
    ],
  },

  proof: {
    items: [
      {
        title: "Demo en vivo",
        value: "track.opentoggl.com",
        body: "Pruébalo primero, decide después.",
        cta: "Abrir demo",
        href: "https://track.opentoggl.com",
      },
      {
        title: "Código fuente",
        value: "CorrectRoadH/OpenTickly",
        body: "Código, issues, discusiones — todo abierto.",
        cta: "Abrir GitHub",
        href: "https://github.com/CorrectRoadH/OpenTickly",
      },
      {
        title: "Documentación",
        value: "Docs y guías",
        body: "Despliegue, referencia API, diseño de producto.",
        cta: "Ver docs",
        href: "/es/docs",
      },
    ],
  },

  faq: [
    {
      question: "¿Puede reemplazar a Toggl Track?",
      answer:
        "Sí. OpenTickly es compatible con las APIs de Track, Reports y Webhooks de Toggl. Si tus herramientas se conectan a Toggl por su API, deberían funcionar con OpenTickly sin cambios.",
    },
    {
      question: "¿Puedo traer mis datos de Toggl?",
      answer: "Sí. Puedes importar archivos de exportación de Toggl — tu historial viene contigo.",
    },
    {
      question: "¿Qué necesito para autoalojar?",
      answer:
        "Docker. Un docker compose up -d levanta todo el stack (backend en Go, frontend en React, PostgreSQL). También hay guías para Synology, CasaOS y fnOS.",
    },
    {
      question: "¿La versión alojada y la autoalojada son iguales?",
      answer: "Sí. Mismo código, mismas funciones. Sin plan premium, sin funciones bloqueadas.",
    },
    {
      question: "¿Por qué amigable con IA?",
      answer:
        "API estable, buena documentación, autoalojable. Agentes y scripts se integran sin límites de terceros.",
    },
  ],
} as const;
