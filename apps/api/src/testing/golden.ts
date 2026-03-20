import { resolve } from "node:path";

import {
  createSampleQuotaContractCase,
  runCompatContractCase,
  type CompatContractCase,
} from "./contracts/compat.ts";
import { getOpenApiRoot, loadJsonDocument } from "./openapi/schema.ts";

export interface GoldenCase extends CompatContractCase {
  fixturePath: string;
}

export interface GoldenCaseResult extends GoldenCase {
  ok: boolean;
  source: CompatContractCase["source"];
  method: string;
  path: string;
  actual: unknown;
  headerErrors: string[];
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function createSampleQuotaGoldenCase(): GoldenCase {
  const fixturePath = resolve(
    getOpenApiRoot(),
    "../apps/api/tests/fixtures/track-get-quota.success.json",
  );

  return {
    ...createSampleQuotaContractCase(),
    fixturePath,
  };
}

export function runGoldenCase(goldenCase: GoldenCase): GoldenCaseResult {
  // Golden samples still go through contract validation so the fixture stays
  // anchored to the public OpenAPI contract instead of drifting into ad-hoc JSON.
  const contractResult = runCompatContractCase(goldenCase);
  const expected = loadJsonDocument<unknown>(goldenCase.fixturePath);
  const ok = contractResult.ok && stableStringify(expected) === stableStringify(goldenCase.actual);

  return {
    ...goldenCase,
    ok,
    actual: goldenCase.actual,
    headerErrors: contractResult.headerErrors,
  };
}
