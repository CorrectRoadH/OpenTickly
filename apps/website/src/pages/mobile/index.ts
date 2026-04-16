// Barrel re-export so the five mobile components ship in a single Vite chunk.
//
// We want two things at once:
//   1. Desktop users (width >= 768) never pay for mobile code.
//   2. Mobile users never pay a per-tab JS fetch when switching tabs.
//
// Solution: keep `React.lazy` on each component in `route-tree-lazy-pages.tsx`
// but make them all share the same dynamic `import("./index.ts")` factory.
// Vite bundles everything reachable from this file into one chunk, so once
// `MobileShell` loads, the four tab pages are already in memory — tab
// switches become cache hits with no network request.
//
// Do NOT add non-mobile imports here; that would leak them into the mobile
// chunk. Do NOT import this file from the main route tree directly; that
// would pull the whole mobile bundle into the main chunk.
export { MobileShell } from "./MobileShell.tsx";
export { MobileTimerPage } from "./MobileTimerPage.tsx";
export { MobileCalendarPage } from "./MobileCalendarPage.tsx";
export { MobileReportPage } from "./MobileReportPage.tsx";
export { MobileMePage } from "./MobileMePage.tsx";
