// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SessionProvider, defaultSessionSnapshot, useSession } from "../session-context.tsx";

function SessionProbe() {
  const session = useSession();

  return (
    <div>
      <span>{session.user.email}</span>
      <span>{session.currentWorkspace.name}</span>
    </div>
  );
}

describe("session context", () => {
  it("provides the bootstrapped workspace baseline to the shell", () => {
    render(
      <SessionProvider value={defaultSessionSnapshot}>
        <SessionProbe />
      </SessionProvider>,
    );

    expect(screen.getByText(defaultSessionSnapshot.user.email)).toBeTruthy();
    expect(screen.getByText(defaultSessionSnapshot.currentWorkspace.name)).toBeTruthy();
  });
});
