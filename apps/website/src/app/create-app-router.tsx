import {
  createBrowserHistory,
  createMemoryHistory,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router";

import { routeTree } from "../routes/route-tree.tsx";

type CreateAppRouterOptions = {
  initialEntries?: string[];
};

export function createAppRouter(options?: CreateAppRouterOptions) {
  const history: RouterHistory = options?.initialEntries
    ? createMemoryHistory({
        initialEntries: options.initialEntries,
      })
    : createBrowserHistory();

  return createRouter({
    defaultPreload: "intent",
    history,
    routeTree,
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}
