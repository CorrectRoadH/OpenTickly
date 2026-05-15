import { QueryClient } from "@tanstack/react-query";

import { installCurrentTimeEntryOfflinePersistence } from "./current-time-entry-offline.ts";

// Centralizing the query client now keeps later server-state hooks from inventing
// their own cache instances inside pages or features.
export function createAppQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: true,
      },
    },
  });

  installCurrentTimeEntryOfflinePersistence(queryClient);

  return queryClient;
}
