import { expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTagForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

/**
 * Re-render regression: toggling a tag inside the inline tag picker on
 * a list row must not keep re-rendering the picker itself nor the
 * surrounding list entry rows.
 *
 * Observed in the live app: after opening the tag picker on any list
 * row and clicking a tag, the picker's own `r:N` badge (top-right of
 * `PickerDropdown`, testid `bulk-edit-tag-picker-rendercount`) keeps
 * ticking up, and every sibling row's `list-entry-rendercount-<id>`
 * badge also climbs — witnesses were seen at `renders: 67` after a
 * single toggle.
 *
 * Two independent assertions, to make the symptom and the cause each
 * individually reportable:
 *
 *  1. Picker dropdown render count: after ONE tag toggle, allow at
 *     most a small constant bump (the optimistic update + the
 *     persisted-state echo). A runaway loop pushes this past the cap.
 *
 *  2. Sibling (witness) row render counts: must not change at all —
 *     per `arePropsEqual` in `ListEntryRow.tsx`, an unrelated entry's
 *     props are reference-stable across a tag mutation on another
 *     entry. If every row still re-renders, the memo boundary is
 *     being defeated upstream (usually: the `tags` / `projects` array
 *     identity changes AND the per-item identity inside changes, or a
 *     parent re-renders the whole list without going through the memo).
 */
test.describe("List entry tag picker re-render hygiene", () => {
  test("toggling a tag in the inline picker does not spin the picker or other rows", async ({
    page,
  }) => {
    const email = `list-tag-rerender-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "List Tag Picker Rerender User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Seed a realistic workspace — multiple tags so the picker has
    // content, AND at least one project. The project is load-bearing:
    // `ConnectedListView` rebuilds its `listViewProjects` via
    // `.filter().map().sort()` on every render, producing fresh item
    // references each time. Row memoization falls back on
    // `shallowListEqual(prev.projects, next.projects)`; that short-
    // circuits on length 0, which is why an empty-project workspace
    // silently hides the regression. Any real workspace has projects,
    // and with even one project every ConnectedListView re-render
    // defeats the memo and cascades into every list row — the exact
    // "renders: 67 across the board" symptom users report.
    await createProjectForWorkspace(page, {
      name: `Rerender Project ${Date.now()}`,
      workspaceId,
    });

    const tagNames = ["1 象限", "2 象限", "3 象限", "4 象限", "专心", "没专心"].map(
      (base) => `${base}-${Date.now()}`,
    );
    for (const name of tagNames) {
      await createTagForWorkspace(page, { name, workspaceId });
    }

    const now = new Date();
    const todayUtc = (hour: number, minute: number) =>
      new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0),
      );

    const entryIds: number[] = [];
    const descriptions = ["Target row", "Witness row A", "Witness row B"];
    for (let i = 0; i < descriptions.length; i++) {
      const id = await createTimeEntryForWorkspace(page, {
        description: descriptions[i]!,
        start: todayUtc(9 + i, 0).toISOString(),
        stop: todayUtc(9 + i, 30).toISOString(),
        workspaceId,
      });
      entryIds.push(id);
    }
    const [targetId, witnessAId, witnessBId] = entryIds as [number, number, number];

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByRole("radio", { name: "List" }).click();
    await expect(page.getByTestId("timer-list-view")).toBeVisible();

    const targetRow = page.locator(
      `[data-testid="time-entry-list-row"][data-entry-id="${targetId}"]`,
    );
    const witnessCounterA = page.getByTestId(`list-entry-rendercount-${witnessAId}`);
    const witnessCounterB = page.getByTestId(`list-entry-rendercount-${witnessBId}`);
    await expect(targetRow).toBeVisible();
    await expect(witnessCounterA).toHaveText(/^renders: \d+$/);
    await expect(witnessCounterB).toHaveText(/^renders: \d+$/);

    // Baseline before we open the picker. Opening the dropdown alone
    // must not move these counts (it's local dialog state), and
    // neither must a single toggle inside.
    const witnessBaselineA = await witnessCounterA.textContent();
    const witnessBaselineB = await witnessCounterB.textContent();

    // Open the tag picker on the target row.
    const tagButton = targetRow.getByRole("button", { name: "Select tags" });
    await expect(tagButton).toBeVisible();
    await tagButton.click();

    const picker = page.getByTestId("bulk-edit-tag-picker");
    await expect(picker).toBeVisible();

    const pickerCounter = page.getByTestId("bulk-edit-tag-picker-rendercount");
    await expect(pickerCounter).toHaveText(/^r:\d+$/);
    const pickerBaselineText = await pickerCounter.textContent();
    const pickerBaseline = Number((pickerBaselineText ?? "r:0").slice(2));
    expect(Number.isFinite(pickerBaseline)).toBe(true);

    // Sibling rows must NOT have re-rendered just because the picker
    // mounted. The picker is a child of the target row only. Use
    // `expect.soft` so that if this first symptom trips, the later
    // post-toggle assertions still run and report independently.
    expect
      .soft(await witnessCounterA.textContent(), "witness A drifted just from opening the picker")
      .toBe(witnessBaselineA);
    expect
      .soft(await witnessCounterB.textContent(), "witness B drifted just from opening the picker")
      .toBe(witnessBaselineB);

    // Toggle one tag on. Wait on the real UI signal — the target row's
    // button content flips from the icon to the tag name. This guarantees
    // the optimistic update has landed AND any follow-up state echo has
    // settled before we read the render counters.
    const pickedTag = tagNames[0]!;
    await picker.getByRole("button", { name: pickedTag, exact: true }).click();
    await expect(tagButton).toContainText(pickedTag);

    // 1. Picker itself: a well-behaved picker re-renders a small, bounded
    //    number of times per toggle (optimistic entry update +
    //    persisted echo). A runaway loop produces dozens of renders.
    //
    //    Threshold of 4 = 2 real commits (optimistic + server) × 2 for
    //    StrictMode (which double-invokes the function body in DEV, and
    //    `useRenderCount` increments a ref inside the body — so the
    //    displayed `r:N` advances by 2 per actual commit). The original
    //    runaway bug surfaced as r:1→r:9+ / renders:67, so 4 still
    //    catches the regression with a wide margin.
    const pickerAfterText = await pickerCounter.textContent();
    const pickerAfter = Number((pickerAfterText ?? "r:0").slice(2));
    expect.soft(pickerAfter).toBeGreaterThanOrEqual(pickerBaseline);
    expect
      .soft(
        pickerAfter - pickerBaseline,
        `PickerDropdown rendered ${pickerAfter - pickerBaseline} extra times after a ` +
          `single tag toggle (baseline r:${pickerBaseline}, after r:${pickerAfter}). ` +
          `Users report the top-right r:N counter ticks continuously while the picker is open.`,
      )
      .toBeLessThanOrEqual(4);

    // 2. Sibling rows: the memo in ListEntryRow should short-circuit
    //    because neither the entry nor any reference-stable prop
    //    changed for them. Witnessed failure mode: every row re-renders
    //    in lockstep with the picker, pushing `renders: N` into the
    //    high double digits. Use soft expects so both witnesses report
    //    independently rather than masking each other.
    expect
      .soft(
        await witnessCounterA.textContent(),
        `witness A re-rendered after a tag toggle on an unrelated entry ` +
          `(baseline ${witnessBaselineA})`,
      )
      .toBe(witnessBaselineA);
    expect
      .soft(
        await witnessCounterB.textContent(),
        `witness B re-rendered after a tag toggle on an unrelated entry ` +
          `(baseline ${witnessBaselineB})`,
      )
      .toBe(witnessBaselineB);
  });
});
