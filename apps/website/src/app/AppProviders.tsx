import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useState, type ReactElement } from "react";
import { Toaster } from "sonner";

import { createAppQueryClient } from "../shared/query/query-client.ts";
import { AppDisplayProvider } from "./AppDisplayProvider.tsx";
import { type AppRouter } from "./create-app-router.tsx";

type AppProvidersProps = {
  router: AppRouter;
};

export function AppProviders({ router }: AppProvidersProps): ReactElement {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <AppDisplayProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--track-surface)",
              border: "1px solid var(--track-border)",
              color: "var(--track-text)",
            },
          }}
          theme="dark"
        />
      </QueryClientProvider>
    </AppDisplayProvider>
  );
}
