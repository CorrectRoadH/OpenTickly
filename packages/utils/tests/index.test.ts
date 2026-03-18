import { expect, test } from "vite-plus/test";
import { fn } from "../src";

test("fn", () => {
  expect(fn()).toBe("Hello, tsdown!");
});
