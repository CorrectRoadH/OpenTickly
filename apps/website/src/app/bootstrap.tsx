import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";
import { AppProviders } from "./AppProviders.tsx";
import { createAppRouter } from "./create-app-router.tsx";
import { createAppQueryClient } from "../shared/query/query-client.ts";
import { sessionQueryKey } from "../shared/query/web-shell.ts";
import { unwrapWebApiResult } from "../shared/api/web-client.ts";
import { getWebSession } from "../shared/api/web/index.ts";

const container = document.querySelector("#app");

if (!container) {
  throw new Error("Missing #app root container");
}

const queryClient = createAppQueryClient();
const router = createAppRouter();

// Prefetch session before first render to avoid flash-of-login-screen.
// Errors are silently ignored — the route guards will handle unauthenticated state.
void queryClient.prefetchQuery({
  queryFn: () => unwrapWebApiResult(getWebSession()),
  queryKey: sessionQueryKey,
});

createRoot(container).render(
  <StrictMode>
    <AppProviders queryClient={queryClient} router={router} />
  </StrictMode>,
);
