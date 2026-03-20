import { describe, expect, it } from "vitest";

import {
  createOrganizationUsersHeaderContractCase,
  createSampleQuotaContractCase,
  loadGeneratedCompatOperationManifest,
  loadCompatOperationManifest,
  runCompatContractCase,
} from "../../src/testing/contracts/compat.ts";

describe("compat contract harness", () => {
  it("builds a generation-first manifest from all compat OpenAPI sources", () => {
    const manifest = loadCompatOperationManifest();

    expect(
      manifest.find(
        (entry) =>
          entry.source === "toggl-track-api-v9.swagger.json" &&
          entry.method === "get" &&
          entry.path === "/me/quota" &&
          entry.operationId === "get-quota",
      ),
    ).toBeTruthy();
    expect(manifest.some((entry) => entry.source === "toggl-reports-v3.swagger.json")).toBe(true);
    expect(manifest.some((entry) => entry.source === "toggl-webhooks-v1.swagger.json")).toBe(true);
  });

  it("loads the generated compat manifest skeleton with operation ids and resolved response schemas", () => {
    const manifest = loadGeneratedCompatOperationManifest();

    expect(manifest.generatedFrom).toEqual([
      "openapi/toggl-track-api-v9.swagger.json",
      "openapi/toggl-reports-v3.swagger.json",
      "openapi/toggl-webhooks-v1.swagger.json",
    ]);
    expect(manifest.operations.every((entry) => entry.operationId.length > 0)).toBe(true);

    const quotaOperation = manifest.operations.find(
      (entry) => entry.path === "/me/quota" && entry.method === "get",
    );
    expect(quotaOperation?.responses["200"]?.bodySchema).toBeTruthy();
    expect(quotaOperation?.responses["200"]?.unsupportedKeywords).toEqual([]);

    const organizationUsersOperation = manifest.operations.find(
      (entry) => entry.path === "/organizations/{organization_id}/users" && entry.method === "get",
    );
    expect(organizationUsersOperation?.responses["200"]?.headers["X-Page"]?.type).toBe("integer");
  });

  it("validates the sample quota payload against the compat OpenAPI schema", () => {
    const sampleCase = createSampleQuotaContractCase();
    const result = runCompatContractCase(sampleCase);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.operationId).toBe("get-quota");
    expect(result.source).toBe("toggl-track-api-v9.swagger.json");
  });

  it("validates documented response headers for a compat endpoint", () => {
    const result = runCompatContractCase(createOrganizationUsersHeaderContractCase());

    expect(result.ok).toBe(true);
    expect(result.headerErrors).toEqual([]);
    expect(result.validatedHeaders).toContain("X-Page");
    expect(result.validatedHeaders).toContain("X-Sort-Order");
  });
});
