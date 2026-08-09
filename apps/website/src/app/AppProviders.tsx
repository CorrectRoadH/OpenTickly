import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { Toaster } from "sonner";

import { AppDisplayProvider } from "./AppDisplayProvider.tsx";
import { type AppRouter } from "./create-app-router.tsx";
import "./i18n.ts";
import { useTheme } from "./theme-context.tsx";

type AppProvidersProps = {
  queryClient: QueryClient;
  router: AppRouter;
};

export function AppProviders({ queryClient, router }: AppProvidersProps): ReactElement {
  return (
    <AppDisplayProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <AppToaster />
      </QueryClientProvider>
    </AppDisplayProvider>
  );
}

function AppToaster(): ReactElement {
  const { resolvedTheme } = useTheme();
  return <Toaster position="bottom-right" richColors theme={resolvedTheme} />;
}
