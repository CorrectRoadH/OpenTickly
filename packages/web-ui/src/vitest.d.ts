import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import "vite-plus/test";

declare module "vite-plus/test" {
  interface Matchers<R, T = unknown> extends TestingLibraryMatchers<T, R> {}
}
