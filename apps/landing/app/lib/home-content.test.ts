import { describe, expect, it } from "vitest";
import { homeContentEn } from "./home-content.en";
import { homeUseCaseItems } from "./home-use-cases";

function collectText(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectText);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectText);
  return [];
}

function countEnglishWords(values: string[]) {
  return values.join(" ").match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0;
}

describe("home page content", () => {
  it("keeps the English homepage above the thin-content floor", () => {
    const words = countEnglishWords([
      ...collectText(homeContentEn),
      ...collectText(homeUseCaseItems),
    ]);
    expect(words).toBeGreaterThanOrEqual(300);
  });
});
