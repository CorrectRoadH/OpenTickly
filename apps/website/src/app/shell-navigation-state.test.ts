import { describe, expect, it } from "vitest";

import {
  isOverviewNavActive,
  isSectionNavActive,
  isTimerNavActive,
} from "./shell-navigation-state.ts";

describe("shell navigation state", () => {
  it("marks overview active only on the overview route", () => {
    expect(isOverviewNavActive("/overview", "/overview")).toBe(true);
    expect(isOverviewNavActive("/timer", "/overview")).toBe(false);
    expect(isOverviewNavActive("/projects/202/list", "/overview")).toBe(false);
  });

  it("marks timer active only on the timer route", () => {
    expect(isTimerNavActive("/timer", "/timer")).toBe(true);
    expect(isTimerNavActive("/overview", "/timer")).toBe(false);
    expect(isTimerNavActive("/workspaces/202", "/timer")).toBe(false);
  });

  it("keeps section navigation subtree matching for nested pages", () => {
    expect(isSectionNavActive("/projects/202/list", "/projects/202/list")).toBe(true);
    expect(isSectionNavActive("/202/projects/14/team", "/projects/202/list")).toBe(true);
    expect(isSectionNavActive("/workspaces/202/clients", "/projects/202/list")).toBe(false);
  });
});
