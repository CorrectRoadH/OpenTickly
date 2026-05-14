import { afterEach, describe, expect, it, vi } from "vitest";

import { copyToClipboard } from "./clipboard.ts";

const originalClipboard = navigator.clipboard;

afterEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: originalClipboard,
  });
});

describe("copyToClipboard", () => {
  it("returns false when the clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    await expect(copyToClipboard("https://example.test")).resolves.toBe(false);
  });

  it("returns false when the browser rejects the copy request", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError")),
      },
    });

    await expect(copyToClipboard("https://example.test")).resolves.toBe(false);
  });

  it("returns true after writing text to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    await expect(copyToClipboard("https://example.test")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://example.test");
  });
});
