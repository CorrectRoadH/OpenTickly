import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

type EntryTimes = { start: number; stop: number | null };

/**
 * Fetches the persisted start/stop of a time entry from the backend.
 * Returns epoch millis so assertions can compare deltas directly.
 */
async function fetchEntryTimes(
  page: import("@playwright/test").Page,
  entryId: number,
): Promise<EntryTimes | null> {
  return page.evaluate(async (id) => {
    const response = await fetch(`/api/v9/me/time_entries`, { credentials: "include" });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      id?: number;
      start?: string;
      stop?: string | null;
    }[];
    const match = payload.find((e) => e.id === id);
    if (!match || !match.start) return null;
    return {
      start: Date.parse(match.start),
      stop: match.stop ? Date.parse(match.stop) : null,
    };
  }, entryId);
}

type CalendarEntrySetup = {
  entryId: number;
  originalStart: number;
  originalStop: number;
};

async function setupCalendarWithEntry(
  page: import("@playwright/test").Page,
  testInfo: import("@playwright/test").TestInfo,
  description: string,
  options: { durationMs?: number } = {},
): Promise<CalendarEntrySetup> {
  const email = `dnd-test-${test.info().workerIndex}-${Date.now()}@example.com`;
  const password = "secret-pass";

  await registerE2eUser(page, testInfo, {
    email,
    fullName: "DnD Test User",
    password,
  });

  await page.context().clearCookies();
  const session = await loginE2eUser(page, testInfo, { email, password });

  const durationMs = options.durationMs ?? 60 * 60 * 1000;
  const now = new Date();
  const start = new Date(now);
  start.setHours(10, 0, 0, 0);
  const stop = new Date(start.getTime() + durationMs);

  const entryId = await createTimeEntryForWorkspace(page, {
    description,
    start: start.toISOString(),
    stop: stop.toISOString(),
    workspaceId: session.currentWorkspaceId,
  });

  await page.reload();
  await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
  await page.getByRole("radio", { name: "Calendar" }).click();

  return {
    entryId,
    originalStart: start.getTime(),
    originalStop: stop.getTime(),
  };
}

async function rightClickAndSelectMenuItem(
  page: import("@playwright/test").Page,
  entry: import("@playwright/test").Locator,
  menuItemName: string,
) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await entry.click({ button: "right", position: { x: 10, y: 10 } });

  const contextMenu = page.getByTestId("calendar-entry-context-menu");
  await expect(contextMenu).toBeVisible();

  await contextMenu
    .getByRole("menuitem", { name: menuItemName })
    .evaluate((el) => (el as HTMLElement).click());

  await expect(contextMenu).not.toBeVisible();
}

/**
 * Performs a staged mouse drag from `from` to `to` in viewport coordinates.
 *
 * Callers must scroll the page into a stable state BEFORE calling boundingBox
 * + this helper — we do not scroll here, or the measured viewport coordinates
 * would go stale.
 *
 * The 50ms pauses between mouse events are the DnD-mouse-step-timing exception
 * allowed by CLAUDE.md — react-big-calendar's Selection utility needs frames
 * between `down` and the first `move` to cross its click tolerance and start
 * a drag instead of treating the sequence as a click.
 */
async function dragByOffset(
  page: import("@playwright/test").Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.waitForTimeout(50);
  await page.mouse.down();
  await page.waitForTimeout(50);

  // Nudge first so r-b-c crosses its click tolerance before we start the
  // main travel. Without this first small move, the first long move is
  // sometimes swallowed.
  await page.mouse.move(from.x + 1, from.y + 1, { steps: 2 });
  await page.waitForTimeout(50);

  for (let i = 1; i <= 20; i++) {
    const x = from.x + (to.x - from.x) * (i / 20);
    const y = from.y + (to.y - from.y) * (i / 20);
    await page.mouse.move(x, y, { steps: 5 });
  }

  await page.waitForTimeout(50);
  await page.mouse.up();
}

async function scrollPageToTop(page: import("@playwright/test").Page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
}

async function clearDragResult(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    delete (window as Window & { __calendarDragResult?: unknown }).__calendarDragResult;
  });
}

// ── Duplicate Tests ──

test.describe("Time entry Duplicate", () => {
  test("Duplicate creates a new time entry, calendar shows 2 entries", async ({ page }) => {
    const description = `dup-test-${Date.now()}`;
    await setupCalendarWithEntry(page, test.info(), description);

    const entry = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: description });
    await expect(entry).toBeVisible({ timeout: 10_000 });

    await rightClickAndSelectMenuItem(page, entry, "Duplicate");

    const allCalendarEntries = page
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: description });
    await expect(allCalendarEntries).toHaveCount(2, { timeout: 10_000 });
  });
});

// ── DnD Move Tests ──

test.describe("Time entry DnD Move", () => {
  test("DnD Move shifts start and stop by the same non-zero delta", async ({ page }) => {
    const description = `move-test-${Date.now()}`;
    const { entryId, originalStart, originalStop } = await setupCalendarWithEntry(
      page,
      test.info(),
      description,
    );

    const entry = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: description });
    await expect(entry).toBeVisible({ timeout: 10_000 });
    await scrollPageToTop(page);
    await entry.scrollIntoViewIfNeeded();

    const box = await entry.boundingBox();
    expect(box).not.toBeNull();

    await clearDragResult(page);

    // Capture every write to the dragged entry. A MOVE must send exactly
    // ONE write (one PUT/PATCH). The reported bug fires a second mutation
    // (resize-end) that is computed from the ORIGINAL start/stop still
    // sitting in state, so the last-write-wins response resets `start`
    // back to the original — matching the user's "only end changed"
    // observation.
    const entryMutations: { method: string; body: string; responseStatus: number }[] = [];
    const entryUrl = new RegExp(`/time_entries/${entryId}(?:\\?|$)`);
    const onRequestFinished = async (req: import("@playwright/test").Request) => {
      if (!entryUrl.test(req.url())) return;
      const m = req.method();
      if (m !== "PATCH" && m !== "PUT" && m !== "POST") return;
      const resp = await req.response().catch(() => null);
      entryMutations.push({
        method: m,
        body: req.postData() ?? "",
        responseStatus: resp?.status() ?? 0,
      });
    };
    page.on("requestfinished", onRequestFinished);

    try {
      // Grab the center (to miss the top/bottom resize handles) and drop one
      // entry-height lower. r-b-c snaps to the nearest slot, so this produces
      // a deterministic non-zero minutesDelta and stays inside the day column.
      const from = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
      const to = { x: from.x, y: from.y + box!.height };
      await dragByOffset(page, from, to);

      // Gate 1 — confirm onEventDrop (not onEventResize) fired.
      await expect
        .poll(
          () =>
            page.evaluate(
              () =>
                (window as Window & { __calendarDragResult?: { minutesDelta: number } })
                  .__calendarDragResult,
            ),
          { timeout: 5_000 },
        )
        .toBeDefined();

      // Gate 2 — wait until all mutations fired by onEventDrop have settled.
      // We poll until `entryMutations` stops growing across two sample
      // windows. Without this, the earlier backend poll could observe the
      // interstitial state after mutation #1 but before mutation #2 lands,
      // hiding the double-write bug.
      await expect
        .poll(
          async () => {
            const n1 = entryMutations.length;
            await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
            const n2 = entryMutations.length;
            return n1 > 0 && n1 === n2;
          },
          { timeout: 10_000 },
        )
        .toBe(true);
    } finally {
      page.off("requestfinished", onRequestFinished);
    }

    const after = await fetchEntryTimes(page, entryId);
    expect(after).not.toBeNull();
    expect(after!.stop).not.toBeNull();

    const startDelta = after!.start - originalStart;
    const stopDelta = after!.stop! - originalStop;

    // Structural assertion: a move is ONE write, not two.
    expect(
      entryMutations.length,
      `expected exactly 1 write to /time_entries/${entryId} for a move; saw ${entryMutations.length}: ${entryMutations
        .map((m) => `${m.method}(${m.responseStatus})`)
        .join(", ")}`,
    ).toBe(1);

    // A MOVE must shift both edges by the same non-zero amount.
    // If the implementation only moves `stop` (the reported bug),
    // startDelta === 0 and this test turns red.
    expect(startDelta).not.toBe(0);
    expect(stopDelta).not.toBe(0);
    expect(startDelta).toBe(stopDelta);

    // Duration is preserved.
    expect(after!.stop! - after!.start).toBe(originalStop - originalStart);
  });

  test("DnD Move preview preserves duration mid-drag (not stretched to end-of-day)", async ({
    page,
  }) => {
    const description = `move-preview-${Date.now()}`;
    await setupCalendarWithEntry(page, test.info(), description);

    const entry = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: description });
    await expect(entry).toBeVisible({ timeout: 10_000 });
    await scrollPageToTop(page);
    await entry.scrollIntoViewIfNeeded();

    const box = await entry.boundingBox();
    expect(box).not.toBeNull();
    const originalHeight = box!.height;

    // Start a drag but do NOT release the mouse — we want to observe
    // r-b-c's in-flight preview.
    const from = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
    const to = { x: from.x, y: from.y + box!.height };

    await page.mouse.move(from.x, from.y);
    await page.waitForTimeout(50);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(from.x + 1, from.y + 1, { steps: 2 });
    await page.waitForTimeout(50);
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(
        from.x + (to.x - from.x) * (i / 10),
        from.y + (to.y - from.y) * (i / 10),
        { steps: 5 },
      );
    }

    // Preview is the event cloned by r-b-c with `__isPreview=true`, tagged
    // via .rbc-addons-dnd-drag-preview on its wrapper (see
    // react-big-calendar/lib/addons/dragAndDrop/EventWrapper.js). Its
    // height must still equal the original entry's height — the preview's
    // `end` must be `start + duration`, never clamped to end-of-day.
    const preview = page.locator(".rbc-addons-dnd-drag-preview");
    let previewBox: { x: number; y: number; width: number; height: number } | null = null;
    try {
      await expect(preview).toBeVisible({ timeout: 2_000 });
      previewBox = await preview.boundingBox();
    } finally {
      // Always release the mouse so subsequent tests don't see a stuck
      // drag state, even if the preview assertions fail above.
      await page.mouse.up();
    }

    expect(previewBox).not.toBeNull();
    // Allow 2px slack for sub-pixel snapping. A preview stretched to
    // end-of-day would typically be many entry-heights tall.
    expect(Math.abs(previewBox!.height - originalHeight)).toBeLessThan(2);
  });

  test("DnD Move preview of a same-minute entry does not stretch to end-of-day", async ({
    page,
  }) => {
    const description = `short-preview-${Date.now()}`;
    // Same-minute start/stop (e.g. 15:59:00 → 15:59:30) trips
    // react-big-calendar's `eventTimes.isZeroDuration` check
    // (node_modules/.../dragAndDrop/common.js:58-60), which extends the
    // drag preview's `end` by a full DAY — the "end-of-day stretch" bug.
    const { entryId } = await setupCalendarWithEntry(page, test.info(), description, {
      durationMs: 30 * 1000,
    });

    // Precondition: confirm the backend persisted a same-minute
    // start/stop. If the server rounded to a minute, we wouldn't be
    // exercising the isZeroDuration trigger at all.
    const persisted = await fetchEntryTimes(page, entryId);
    expect(persisted).not.toBeNull();
    expect(persisted!.stop).not.toBeNull();
    expect(Math.floor(persisted!.start / 60_000)).toBe(Math.floor(persisted!.stop! / 60_000));

    const entry = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: description });
    await expect(entry).toBeVisible({ timeout: 10_000 });
    await scrollPageToTop(page);
    await entry.scrollIntoViewIfNeeded();

    const box = await entry.boundingBox();
    expect(box).not.toBeNull();
    const originalHeight = box!.height;

    // Sanity: the entry should render tiny (well under a full slot). If
    // this blows up, the seed duration is wrong, not the preview.
    expect(originalHeight).toBeLessThan(20);

    // Short entries have no room in the middle for a safe grab point —
    // grabbing at `box.height / 2` can land inside a 3px resize anchor.
    // Grab by the outer rbc-event wrapper's centroid instead, which
    // includes the resize anchors top+bottom and is taller than the
    // 1-minute card.
    const wrapper = entry.locator(
      "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' rbc-event ')]",
    );
    const wrapperBox = await wrapper.boundingBox();
    expect(wrapperBox).not.toBeNull();

    const from = {
      x: wrapperBox!.x + wrapperBox!.width / 2,
      y: wrapperBox!.y + wrapperBox!.height / 2,
    };
    // Move two slots (~60px) down to definitely trigger a drag.
    const to = { x: from.x, y: from.y + 60 };

    await page.mouse.move(from.x, from.y);
    await page.waitForTimeout(50);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(from.x + 1, from.y + 1, { steps: 2 });
    await page.waitForTimeout(50);
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(
        from.x + (to.x - from.x) * (i / 10),
        from.y + (to.y - from.y) * (i / 10),
        { steps: 5 },
      );
    }

    const preview = page.locator(".rbc-addons-dnd-drag-preview");
    let previewBox: { x: number; y: number; width: number; height: number } | null = null;
    try {
      await expect(preview).toBeVisible({ timeout: 2_000 });
      previewBox = await preview.boundingBox();
    } finally {
      await page.mouse.up();
    }

    expect(previewBox).not.toBeNull();
    // Pixel-level guard against r-b-c's isZeroDuration stretch. The day
    // column is ~1440px (1 px per minute at the default calendar scale); if `end` gets
    // extended by a full day, the preview balloons to >1000px tall. A
    // healthy short entry's preview stays within a few slots.
    expect(
      previewBox!.height,
      `preview height ${previewBox!.height}px looks like an end-of-day stretch (parent ~1440px)`,
    ).toBeLessThan(200);
  });
});

// ── DnD Resize Tests ──

test.describe("Time entry DnD Resize", () => {
  test("DnD Resize start edge moves start only, stop unchanged", async ({ page }) => {
    const description = `resize-start-${Date.now()}`;
    const { entryId, originalStart, originalStop } = await setupCalendarWithEntry(
      page,
      test.info(),
      description,
    );

    const entry = page
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: description })
      .first();
    await expect(entry).toBeVisible({ timeout: 10_000 });
    await scrollPageToTop(page);
    await entry.scrollIntoViewIfNeeded();

    const box = await entry.boundingBox();
    expect(box).not.toBeNull();

    // Hover first so r-b-c shows the resize anchors (they are display:none
    // until the event is hovered), then grab the top anchor by its DOM class.
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    const topAnchor = entry
      .locator(
        "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' rbc-event ')]",
      )
      .locator(".rbc-addons-dnd-resize-ns-anchor")
      .first();
    const anchorBox = await topAnchor.boundingBox();
    expect(anchorBox).not.toBeNull();

    const from = {
      x: anchorBox!.x + anchorBox!.width / 2,
      y: anchorBox!.y + anchorBox!.height / 2,
    };
    const to = { x: from.x, y: from.y - Math.round(box!.height / 2) };
    await dragByOffset(page, from, to);

    await expect
      .poll(
        async () => {
          const t = await fetchEntryTimes(page, entryId);
          if (!t || t.stop === null) return null;
          return t.start !== originalStart ? t : null;
        },
        { timeout: 10_000 },
      )
      .not.toBeNull();

    const after = await fetchEntryTimes(page, entryId);
    expect(after).not.toBeNull();
    expect(after!.start).not.toBe(originalStart);
    expect(after!.stop).toBe(originalStop);
  });

  test("DnD Resize end edge moves stop only, start unchanged", async ({ page }) => {
    const description = `resize-end-${Date.now()}`;
    const { entryId, originalStart, originalStop } = await setupCalendarWithEntry(
      page,
      test.info(),
      description,
    );

    const entry = page
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: description })
      .first();
    await expect(entry).toBeVisible({ timeout: 10_000 });
    await scrollPageToTop(page);
    await entry.scrollIntoViewIfNeeded();

    const box = await entry.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    const bottomAnchor = entry
      .locator(
        "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' rbc-event ')]",
      )
      .locator(".rbc-addons-dnd-resize-ns-anchor")
      .last();
    const anchorBox = await bottomAnchor.boundingBox();
    expect(anchorBox).not.toBeNull();

    // Capture PATCH/PUT calls to time_entries during the drag. This lets us
    // distinguish two failure modes:
    //   (a) geometry miss — drag never fires, no network call
    //   (b) real bug     — drag fires, mutation is sent, but backend or
    //                     frontend drops the new `stop`
    const mutationCalls: { method: string; url: string; body: string }[] = [];
    const captureMutations = (req: import("@playwright/test").Request) => {
      const url = req.url();
      if (!/\/time_entries\/\d+/.test(url)) return;
      const m = req.method();
      if (m !== "PATCH" && m !== "PUT" && m !== "POST") return;
      mutationCalls.push({ method: m, url, body: req.postData() ?? "" });
    };
    page.on("request", captureMutations);

    try {
      const from = {
        x: anchorBox!.x + anchorBox!.width / 2,
        y: anchorBox!.y + anchorBox!.height / 2,
      };
      // Drag a full entry height downward so we clearly cross a slot
      // boundary and r-b-c snaps to a new stop time.
      const to = { x: from.x, y: from.y + box!.height };
      await dragByOffset(page, from, to);
    } finally {
      // Network events are still recorded after dragByOffset completes.
      // We unlisten after the backend poll window below.
    }

    // If no mutation was sent in a short window, the drag never triggered
    // onEventResize. Surface that as a clean precondition failure rather
    // than letting the backend poll timeout with a misleading message.
    await expect
      .poll(() => mutationCalls.length, {
        timeout: 5_000,
        message: "onEventResize did not fire — drag geometry missed the bottom resize anchor",
      })
      .toBeGreaterThan(0);

    await expect
      .poll(
        async () => {
          const t = await fetchEntryTimes(page, entryId);
          if (!t || t.stop === null) return null;
          return t.stop !== originalStop ? t : null;
        },
        { timeout: 10_000 },
      )
      .not.toBeNull();

    const after = await fetchEntryTimes(page, entryId);
    expect(after).not.toBeNull();
    expect(after!.start).toBe(originalStart);
    expect(after!.stop).not.toBe(originalStop);
  });
});

// ── DnD Move Running Entry ──

test.describe("Time entry DnD Move - Running Entry", () => {
  test("DnD Move on running entry does not mutate start time", async ({ page }) => {
    const email = `dnd-running-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "DnD Running User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Create a running entry (no stop time).
    const runningId = await page.evaluate(
      async ({ workspaceId: wid }) => {
        const response = await fetch(`/api/v9/workspaces/${wid}/time_entries`, {
          body: JSON.stringify({
            created_with: "playwright-e2e",
            description: `running-entry-${Date.now()}`,
            start: new Date().toISOString(),
            workspace_id: wid,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (!response.ok) {
          throw new Error(`Failed to create running entry: ${response.status}`);
        }
        const payload = (await response.json()) as { id?: number };
        return payload.id ?? 0;
      },
      { workspaceId },
    );

    const before = await fetchEntryTimes(page, runningId);
    expect(before).not.toBeNull();
    expect(before!.stop).toBeNull();

    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByRole("radio", { name: "Calendar" }).click();

    const runningEntry = page.locator(`[data-testid^="calendar-entry-"]`).filter({
      hasText: `running-entry-`,
    });

    const isVisible = await runningEntry.isVisible().catch(() => false);
    if (!isVisible) {
      // Running entries may not appear in calendar view in every layout.
      return;
    }

    await scrollPageToTop(page);
    const entryBox = await runningEntry.boundingBox();
    if (!entryBox) return;

    await clearDragResult(page);

    await dragByOffset(
      page,
      { x: entryBox.x + entryBox.width / 2, y: entryBox.y + entryBox.height / 2 },
      { x: entryBox.x + entryBox.width / 2 + 60, y: entryBox.y + entryBox.height / 2 },
    );

    // Flush two animation frames so any (unexpected) onEventDrop would have
    // fired synchronously before we assert.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );

    const dragResult = await page.evaluate(
      () => (window as Window & { __calendarDragResult?: unknown }).__calendarDragResult,
    );
    expect(dragResult).toBeUndefined();

    // Source of truth: the persisted start must be unchanged.
    const after = await fetchEntryTimes(page, runningId);
    expect(after).not.toBeNull();
    expect(after!.start).toBe(before!.start);
    expect(after!.stop).toBeNull();
  });
});
