import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigate,
} from "react-router";
import { RootProvider } from "fumadocs-ui/provider/react-router";
import type { Route } from "./+types/root";
import "./app.css";
import SearchDialog from "@/components/search";
import NotFound from "./routes/not-found";
import { i18n } from "@/lib/i18n";
import { useCallback, useEffect, useMemo } from "react";

const localeItems = [
  { name: "English", locale: "en" },
  { name: "中文", locale: "zh" },
  { name: "Español", locale: "es" },
  { name: "日本語", locale: "ja" },
  { name: "Français", locale: "fr" },
  { name: "한국어", locale: "ko" },
  { name: "Polski", locale: "pl" },
  { name: "Português", locale: "pt" },
];

function useLocaleFromPath() {
  const { pathname } = useLocation();
  const firstSegment = pathname.split("/")[1];
  if ((i18n.languages as readonly string[]).includes(firstSegment)) return firstSegment;
  return i18n.defaultLanguage;
}

export const links: Route.LinksFunction = () => [
  {
    rel: "preload",
    as: "image",
    href: "/hero/opentickly-overview-960.webp",
    media: "(max-width: 768px)",
    imageSrcSet: "/hero/opentickly-overview-640.webp 640w, /hero/opentickly-overview-960.webp 960w",
    imageSizes: "calc(100vw - 32px)",
    fetchPriority: "high",
  },
  {
    rel: "preload",
    as: "image",
    href: "/hero/opentickly-overview-1280.webp",
    media: "(min-width: 769px)",
    imageSrcSet: "/hero/opentickly-overview-1280.webp 1280w",
    imageSizes: "896px",
    fetchPriority: "high",
  },
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const locale = useLocaleFromPath();
  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--track-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--track-button-text)]"
        >
          Skip to content
        </a>
        {children}
        <DeferredAnalytics />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function DeferredAnalytics() {
  useEffect(() => {
    let loaded = false;
    let delay: number | undefined;
    let idle: number | undefined;

    const loadAnalytics = () => {
      if (loaded) return;
      loaded = true;

      const ahrefs = document.createElement("script");
      ahrefs.async = true;
      ahrefs.dataset.key = "HInytZVgzDj+QByz5SZcSA";
      ahrefs.src = "https://analytics.ahrefs.com/analytics.js";
      document.head.append(ahrefs);

      const goshipfast = document.createElement("script");
      goshipfast.async = true;
      goshipfast.dataset.endpoint = "https://api.goshipfast.com";
      goshipfast.dataset.project = "cmqkx4dgb00c1ow10h271w7tt";
      goshipfast.src = "https://api.goshipfast.com/tracker.js";
      document.head.append(goshipfast);
    };

    const scheduleAnalytics = () => {
      delay = window.setTimeout(() => {
        if ("requestIdleCallback" in window) {
          idle = window.requestIdleCallback(loadAnalytics, { timeout: 5000 });
          return;
        }

        loadAnalytics();
      }, 12_000);
    };

    if (document.readyState === "complete") {
      scheduleAnalytics();
    } else {
      window.addEventListener("load", scheduleAnalytics, { once: true });
    }

    return () => {
      window.removeEventListener("load", scheduleAnalytics);
      if (delay !== undefined) window.clearTimeout(delay);
      if (idle !== undefined) window.cancelIdleCallback(idle);
    };
  }, []);

  return null;
}

export default function App() {
  const locale = useLocaleFromPath();
  const navigate = useNavigate();

  const onLocaleChange = useCallback(
    (newLocale: string) => {
      const { pathname } = window.location;
      const isDefault = locale === i18n.defaultLanguage;
      const newIsDefault = newLocale === i18n.defaultLanguage;

      let newPath: string;
      if (isDefault && !newIsDefault) {
        newPath = `/${newLocale}${pathname}`;
      } else if (!isDefault && newIsDefault) {
        newPath = pathname.replace(`/${locale}`, "") || "/";
      } else if (!isDefault && !newIsDefault) {
        newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
      } else {
        return;
      }

      void navigate(newPath);
    },
    [locale, navigate],
  );

  const i18nConfig = useMemo(
    () => ({
      locale,
      locales: localeItems,
      onLocaleChange,
    }),
    [locale, onLocaleChange],
  );

  return (
    <RootProvider search={{ SearchDialog }} i18n={i18nConfig} theme={{ enabled: false }}>
      <Outlet />
    </RootProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Request failed";
  let details = "The landing site hit an unexpected error.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return <NotFound />;
    message = "Error";
    details = error.statusText;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main id="main-content" className="pt-16 p-4 w-full max-w-[1400px] mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
