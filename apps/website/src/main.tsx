import { captureException, initDemoTelemetry } from "@opentickly/monitoring/browser";
initDemoTelemetry();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener(
    "load",
    () => {
      const base = import.meta.env.BASE_URL;
      void navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch((error) => {
        captureException(error);
      });
    },
    { once: true },
  );
}

void import("./app/bootstrap.tsx");
