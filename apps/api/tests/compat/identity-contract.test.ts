import { describe, expect, it } from "vitest";

import {
  loadGeneratedCompatOperationManifest,
  runCompatContractCase,
} from "../../src/testing/contracts/compat.ts";

describe("identity compat contract", () => {
  it("tracks the covered identity compat operations in the generated manifest", () => {
    const manifest = loadGeneratedCompatOperationManifest();

    expect(
      manifest.operations
        .filter((entry) =>
          [
            "get-me",
            "put-me",
            "get-preferences",
            "post-preferences",
            "post-reset-token",
            "get-me-logged",
          ].includes(entry.operationId),
        )
        .map((entry) => entry.operationId)
        .sort(),
    ).toEqual(
      [
        "get-me",
        "get-me-logged",
        "get-preferences",
        "post-reset-token",
        "post-preferences",
        "put-me",
      ].sort(),
    );

    const getMe = manifest.operations.find(
      (entry) => entry.path === "/me" && entry.method === "get",
    );
    expect(getMe?.responses["200"]?.unsupportedKeywords.length).toBeGreaterThan(0);

    const getPreferences = manifest.operations.find(
      (entry) => entry.path === "/me/preferences" && entry.method === "get",
    );
    expect(getPreferences?.responses["200"]?.unsupportedKeywords.length).toBeGreaterThan(0);
  });

  it("accepts the simple success bodies already supported by the compat harness", () => {
    const cases = [
      {
        source: "toggl-track-api-v9.swagger.json" as const,
        method: "post",
        path: "/me/reset_token",
        status: 200,
        actual: "api-token-3",
        operationId: "post-reset-token",
      },
      {
        source: "toggl-track-api-v9.swagger.json" as const,
        method: "get",
        path: "/me/logged",
        status: 200,
        actual: undefined,
        operationId: "get-me-logged",
      },
    ];

    for (const contractCase of cases) {
      const result = runCompatContractCase(contractCase);

      expect(result.ok, `${contractCase.method.toUpperCase()} ${contractCase.path}`).toBe(true);
      expect(result.operationId).toBe(contractCase.operationId);
    }
  });

  it("accepts concrete error mappings produced by the identity compat transport slice", () => {
    const cases = [
      {
        source: "toggl-track-api-v9.swagger.json" as const,
        method: "get",
        path: "/me",
        status: 403,
        actual: "User does not have access to this resource.",
        operationId: "get-me",
      },
      {
        source: "toggl-track-api-v9.swagger.json" as const,
        method: "put",
        path: "/me",
        status: 400,
        actual: "Current password must be present to change password",
        operationId: "put-me",
      },
      {
        source: "toggl-track-api-v9.swagger.json" as const,
        method: "post",
        path: "/me/preferences",
        status: 400,
        actual: "Cannot set value for ToSAcceptNeeded",
        operationId: "post-preferences",
      },
    ];

    for (const contractCase of cases) {
      const result = runCompatContractCase(contractCase);

      expect(result.ok, `${contractCase.method.toUpperCase()} ${contractCase.path}`).toBe(true);
      expect(result.operationId).toBe(contractCase.operationId);
    }
  });
});
