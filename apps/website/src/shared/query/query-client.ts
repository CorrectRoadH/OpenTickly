import { QueryClient } from "@tanstack/react-query";

// Centralizing the query client now keeps later server-state hooks from inventing
// their own cache instances inside pages or features.
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: true,
      },
    },
  });
}
