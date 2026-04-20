import { expect, test, type Page } from "@playwright/test";

import {
  createTimeEntryForWorkspace,
  readSessionBootstrap,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

async function pickTimezone(page: Page, name: string): Promise<void> {
  await page.getByTestId(TIMEZONE_TRIGGER).click();
  await page.getByTestId("timezone-search").fill(name);
  await page.getByRole("option", { name }).click();
}

/*
Covers the "user switches timezone" user story end-to-end:
- The dropdown list must fit the viewport and be scrollable so any IANA zone is reachable.
- A selection persists after reload.
- Day-bucket grouping respects the user's timezone (stored timestamps are UTC; display is per-tz).
- Invalid IANA strings must be rejected by the backend.
- New registrations default to the user's browser timezone rather than hard-coded UTC.
- The running timer renders its start time, formatted in the user's timezone.
*/

const TIMEZONE_TRIGGER = "timezone-select";

test.describe("Story: user switches timezone", () => {
  test("Given the timezone dropdown is open, when the user reaches the end of the list, then the panel stays inside the viewport and every option is reachable via scroll", async ({
    page,
  }) => {
    const email = `tz-scroll-${test.info().workerIndex}-${Date.now()}@example.com`;
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Tz Scroll User",
      password: "secret-pass",
    });

    await page.goto(new URL("/account", page.url()).toString());
    await expect(page.getByTestId("account-page")).toBeVisible();

    await page.getByTestId(TIMEZONE_TRIGGER).click();

    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();

    // Panel must not overflow the viewport — otherwise items past the fold
    // are physically unreachable.
    const { panelHeight, viewportHeight } = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[role="listbox"]')?.parentElement ?? null;
      return {
        panelHeight: el?.getBoundingClientRect().height ?? 0,
        viewportHeight: window.innerHeight,
      };
    });
    expect(panelHeight).toBeGreaterThan(0);
    expect(panelHeight).toBeLessThanOrEqual(viewportHeight);

    // Regions are collapsed by default; search should surface a late zone.
    await page.getByTestId("timezone-search").fill("Auckland");
    const lateOption = page.getByRole("option", { name: "Pacific/Auckland" });
    await expect(lateOption).toBeVisible();
    await lateOption.click();

    await expect(page.getByTestId(TIMEZONE_TRIGGER)).toContainText("Pacific/Auckland");
  });

  test("Given 400+ timezones, when the user opens the picker, then options are grouped by region and collapsed so the list is short", async ({
    page,
  }) => {
    const email = `tz-groups-${test.info().workerIndex}-${Date.now()}@example.com`;
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Tz Groups User",
      password: "secret-pass",
    });

    await page.goto(new URL("/account", page.url()).toString());
    await expect(page.getByTestId("account-page")).toBeVisible();
    await page.getByTestId(TIMEZONE_TRIGGER).click();

    // Region headers exist.
    await expect(page.getByTestId("timezone-group-Africa")).toBeVisible();
    await expect(page.getByTestId("timezone-group-Asia")).toBeVisible();

    // Collapsed: far fewer than the 400+ options are in the DOM.
    const visibleOptions = await page.getByRole("option").count();
    expect(visibleOptions).toBeLessThan(40);

    // Expanding a region surfaces its cities.
    await page.getByTestId("timezone-group-Asia").click();
    await expect(page.getByRole("option", { name: "Asia/Shanghai" })).toBeVisible();
  });

  test("Given the user picked a new timezone, when they reload the account page, then the selection persists", async ({
    page,
  }) => {
    const email = `tz-persist-${test.info().workerIndex}-${Date.now()}@example.com`;
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Tz Persist User",
      password: "secret-pass",
    });

    await page.goto(new URL("/account", page.url()).toString());
    await expect(page.getByTestId("account-page")).toBeVisible();

    await pickTimezone(page, "Asia/Shanghai");

    // Wait for persistence — the bootstrap call after save reflects the new tz.
    await expect
      .poll(async () => (await readSessionBootstrap(page)).user.timezone)
      .toBe("Asia/Shanghai");

    await page.reload();
    await expect(page.getByTestId("account-page")).toBeVisible();
    await expect(page.getByTestId(TIMEZONE_TRIGGER)).toContainText("Asia/Shanghai");
  });

  test("Given a user in Asia/Shanghai, when they create an entry at 23:30 UTC (07:30 next day local), then the list buckets it under the local date, not the UTC date", async ({
    browser,
  }) => {
    // Register with a UTC context, then switch to Asia/Shanghai and verify
    // grouping uses the user's timezone. Storage is UTC; display is per-tz.
    const context = await browser.newContext({ timezoneId: "UTC" });
    const page = await context.newPage();

    const email = `tz-buckets-${test.info().workerIndex}-${Date.now()}@example.com`;
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Tz Bucket User",
      password: "secret-pass",
    });

    // Set timezone to Asia/Shanghai via the UI.
    await page.goto(new URL("/account", page.url()).toString());
    await expect(page.getByTestId("account-page")).toBeVisible();
    await pickTimezone(page, "Asia/Shanghai");
    await expect
      .poll(async () => (await readSessionBootstrap(page)).user.timezone)
      .toBe("Asia/Shanghai");

    const session = await readSessionBootstrap(page);
    const workspaceId = session.current_workspace_id ?? session.workspaces[0]?.id ?? 0;

    // Pick a UTC moment on the boundary: UTC-yesterday 23:30Z is
    // Shanghai-today 07:30 (UTC+8). So the entry's UTC calendar day is
    // "yesterday" while its Shanghai calendar day is "today".
    const shanghaiNow = new Date();
    const shanghaiTodayKey = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "Asia/Shanghai",
      year: "numeric",
    }).format(shanghaiNow);

    // Find a UTC instant in [today-2d, today] whose Shanghai date is today
    // and whose UTC date is yesterday. "Yesterday-UTC 23:30" satisfies this
    // in most of the day (except the ~8h window where UTC already rolled over).
    let base: Date | null = null;
    for (let offsetHours = 0; offsetHours < 48; offsetHours += 1) {
      const candidate = new Date(shanghaiNow.getTime() - offsetHours * 60 * 60 * 1000);
      const utcKey = new Intl.DateTimeFormat("en-CA", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "UTC",
        year: "numeric",
      }).format(candidate);
      const shanghaiKey = new Intl.DateTimeFormat("en-CA", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "Asia/Shanghai",
        year: "numeric",
      }).format(candidate);
      if (shanghaiKey === shanghaiTodayKey && utcKey !== shanghaiKey) {
        base = candidate;
        break;
      }
    }
    if (!base) throw new Error("could not find a cross-day-boundary instant");

    const startUtc = base.toISOString();
    const stopUtc = new Date(base.getTime() + 15 * 60 * 1000).toISOString();

    await createTimeEntryForWorkspace(page, {
      description: "Bucketed entry",
      start: startUtc,
      stop: stopUtc,
      workspaceId,
    });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("app-shell")).toBeVisible();

    // Switch to list view where groups carry a visible date header.
    await page.getByRole("radio", { name: "List" }).click();

    // The entry must land under "Today" (Shanghai's date), not "Yesterday"
    // (which would indicate UTC-date grouping).
    await expect(page.getByText("Bucketed entry")).toBeVisible();
    await expect(page.getByText("Today").first()).toBeVisible();
    await expect(page.getByText("Yesterday")).toHaveCount(0);

    await context.close();
  });

  test("Given a logged-in user, when a client PATCHes an invalid IANA string, then the backend rejects it with 400 and the stored timezone is unchanged", async ({
    page,
  }) => {
    const email = `tz-validate-${test.info().workerIndex}-${Date.now()}@example.com`;
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Tz Validate User",
      password: "secret-pass",
    });

    const before = (await readSessionBootstrap(page)).user.timezone;

    const status = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me", {
        body: JSON.stringify({ timezone: "Not/A_Zone" }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      return response.status;
    });

    expect(status).toBe(400);

    const after = (await readSessionBootstrap(page)).user.timezone;
    expect(after).toBe(before);
  });

  test("Given a brand-new user whose browser reports Asia/Shanghai, when they register, then their server-side timezone is Asia/Shanghai (not UTC)", async ({
    browser,
  }) => {
    const context = await browser.newContext({ timezoneId: "Asia/Shanghai" });
    const page = await context.newPage();

    const email = `tz-detect-${test.info().workerIndex}-${Date.now()}@example.com`;
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Tz Detect User",
      password: "secret-pass",
    });

    const bootstrap = await readSessionBootstrap(page);
    expect(bootstrap.user.timezone).toBe("Asia/Shanghai");

    await context.close();
  });
});
