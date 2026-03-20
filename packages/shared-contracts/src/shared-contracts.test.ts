import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import {
  capabilitySnapshotSchema,
  featureGateDecisionHeaderSchema,
  featureCapabilitySchema,
  featureGateDecisionSchema,
  quotaWindowSchema,
  quotaWindowHeaderSchemas,
  sharedContractsDocument,
  sharedContractsGeneratedArtifact,
} from "./index.ts";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const sharedSourcePath = resolve(repositoryRoot, "openapi/opentoggl-shared.openapi.json");
const legacySourcePath = resolve(
  repositoryRoot,
  "packages/shared-contracts/openapi/public.openapi.json",
);
const sharedRefConsumers = [
  "openapi/opentoggl-admin.openapi.json",
  "openapi/opentoggl-import.openapi.json",
  "openapi/opentoggl-web.openapi.json",
] as const;

describe("shared contracts", () => {
  it("exports the centralized capability and quota schemas", () => {
    expect(featureCapabilitySchema.properties!.key!.type).toBe("string");
    expect(featureGateDecisionSchema.properties!.allowed!.type).toBe("boolean");
    expect(quotaWindowSchema.properties!.remaining!.type).toBe("integer");
    expect(capabilitySnapshotSchema.properties!.capabilities!.type).toBe("array");
  });

  it("re-exports generated contract metadata instead of parallel handwritten truth", () => {
    expect(sharedContractsGeneratedArtifact.source).toBe("openapi/opentoggl-shared.openapi.json");
    expect(sharedContractsGeneratedArtifact.schemaNames).toContain("FeatureGateDecision");
    expect(sharedContractsGeneratedArtifact.headerNames).toContain("X-OpenToggl-Feature-Gate");
  });

  it("exports shared quota and feature-gate header skeletons", () => {
    expect(quotaWindowHeaderSchemas["X-OpenToggl-Quota-Remaining"].schema.type).toBe("integer");
    expect(featureGateDecisionHeaderSchema.schema.type).toBe("string");
  });

  it("keeps the OpenAPI component document aligned with the code exports", () => {
    expect(sharedContractsDocument.components.schemas.FeatureCapability).toEqual(
      featureCapabilitySchema,
    );
    expect(sharedContractsDocument.components.schemas.FeatureGateDecision).toEqual(
      featureGateDecisionSchema,
    );
    expect(sharedContractsDocument.components.schemas.QuotaWindow).toEqual(quotaWindowSchema);
    expect(sharedContractsDocument.components.headers["X-OpenToggl-Feature-Gate"]).toEqual(
      featureGateDecisionHeaderSchema,
    );
  });

  it("keeps root openapi as the single shared-contract source of truth", () => {
    expect(() => JSON.parse(readFileSync(sharedSourcePath, "utf8"))).not.toThrow();
    expect(() => readFileSync(legacySourcePath, "utf8")).toThrow();

    for (const relativePath of sharedRefConsumers) {
      const document = readFileSync(resolve(repositoryRoot, relativePath), "utf8");
      expect(document).toContain("./opentoggl-shared.openapi.json#/components/");
      expect(document).not.toContain("packages/shared-contracts/openapi/public.openapi.json");
    }
  });

  it("fails closed when the generator sees unsupported schema constructs", () => {
    const fixtureDir = mkdtempSync(join(tmpdir(), "shared-contracts-generator-"));
    const sourcePath = resolve(fixtureDir, "unsupported.openapi.json");
    const targetPath = resolve(fixtureDir, "unsupported.generated.ts");

    writeFileSync(
      sourcePath,
      JSON.stringify({
        openapi: "3.1.0",
        info: {
          title: "Unsupported Schema Fixture",
          version: "0.0.0",
        },
        components: {
          headers: {},
          schemas: {
            UnsupportedShape: {
              oneOf: [{ type: "string" }, { type: "integer" }],
            },
          },
        },
      }),
    );

    const result = spawnSync(
      process.execPath,
      [
        "packages/shared-contracts/scripts/generate-shared-contracts.mjs",
        "--source",
        sourcePath,
        "--target",
        targetPath,
      ],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
      },
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain("Unsupported schema");
  });

  it("rejects invalid shared payloads through the app-agnostic validation seam", async () => {
    const module = (await import("./index.ts")) as Record<string, unknown>;

    expect(typeof module.parseCapabilitySnapshot).toBe("function");
    expect(typeof module.parseFeatureGateDecision).toBe("function");

    const parseCapabilitySnapshot = module.parseCapabilitySnapshot as (value: unknown) => unknown;
    const parseFeatureGateDecision = module.parseFeatureGateDecision as (value: unknown) => unknown;

    expect(
      parseCapabilitySnapshot({
        context: {
          scope: "workspace",
          organization_id: 1,
          workspace_id: 2,
        },
        capabilities: [
          {
            key: "imports",
            enabled: true,
            source: "billing",
          },
        ],
      }),
    ).toEqual({
      context: {
        scope: "workspace",
        organization_id: 1,
        workspace_id: 2,
      },
      capabilities: [
        {
          key: "imports",
          enabled: true,
          source: "billing",
        },
      ],
    });

    expect(() =>
      parseFeatureGateDecision({
        capability_key: "imports",
        allowed: "yes",
        reason: "allowed",
      }),
    ).toThrow(/allowed/);

    expect(() =>
      parseCapabilitySnapshot({
        context: {
          scope: "workspace",
        },
        capabilities: [
          {
            key: "imports",
            enabled: true,
            source: "unknown",
          },
        ],
      }),
    ).toThrow(/capabilities/);
  });
});
