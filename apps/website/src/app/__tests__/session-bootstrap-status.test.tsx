// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SessionProvider, defaultSessionSnapshot } from "../../shared/session/session-context.tsx";
import { SessionBootstrapStatus } from "../SessionBootstrapStatus.tsx";

describe("session bootstrap status", () => {
  it("shows that the formal shell finished bootstrapping session state", () => {
    render(
      <SessionProvider value={defaultSessionSnapshot}>
        <SessionBootstrapStatus />
      </SessionProvider>,
    );

    expect(screen.getByText("Session ready")).toBeTruthy();
    expect(screen.getByText(defaultSessionSnapshot.currentWorkspace.name)).toBeTruthy();
  });
});
