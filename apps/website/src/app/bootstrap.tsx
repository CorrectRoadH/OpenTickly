import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";
import { AppProviders } from "./AppProviders.tsx";
import { createAppRouter } from "./create-app-router.tsx";

const container = document.querySelector("#app");

if (!container) {
  throw new Error("Missing #app root container");
}

const router = createAppRouter();

createRoot(container).render(
  <StrictMode>
    <AppProviders router={router} />
  </StrictMode>,
);
