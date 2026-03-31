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
import { useCallback, useMemo } from "react";

const localeItems = [
  { name: "English", locale: "en" },
  { name: "中文", locale: "zh" },
];

function useLocaleFromPath() {
  const { pathname } = useLocation();
  const firstSegment = pathname.split("/")[1];
  if ((i18n.languages as readonly string[]).includes(firstSegment)) return firstSegment;
  return i18n.defaultLanguage;
}

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="HInytZVgzDj+QByz5SZcSA"
          async
        />
      </head>
      <body className="flex flex-col min-h-screen">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
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
    <RootProvider search={{ SearchDialog }} i18n={i18nConfig}>
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
    <main className="pt-16 p-4 w-full max-w-[1400px] mx-auto">
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
