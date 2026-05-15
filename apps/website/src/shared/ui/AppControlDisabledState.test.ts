import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const webUiRoot = resolve(import.meta.dirname, "../../../../../packages/web-ui/src");

describe("shared control disabled states", () => {
  test("AppButton uses explicit disabled colors instead of opacity-only disabled styling", () => {
    const source = readFileSync(resolve(webUiRoot, "AppButton.tsx"), "utf8");

    expect(source).toContain("disabled:border-[var(--track-control-border)]");
    expect(source).toContain("disabled:bg-[var(--track-control-disabled-strong)]");
    expect(source).toContain("disabled:text-[var(--track-text-muted)]");
    expect(source).not.toContain("disabled:opacity-50");
  });

  test("AppSwitch removes accent colors when disabled even if checked", () => {
    const source = readFileSync(resolve(webUiRoot, "AppSwitch.tsx"), "utf8");

    expect(source).toContain("isDisabled");
    expect(source).toContain(
      "border-[var(--track-control-border)] bg-[var(--track-control-disabled-strong)]",
    );
    expect(source).toContain("data-[disabled=true]:border-[var(--track-control-border)]");
    expect(source).toContain("data-[disabled=true]:shadow-[0_3px_0_0_var(--track-control-border)]");
    expect(source).not.toContain("disabled:opacity-50");
  });
});
