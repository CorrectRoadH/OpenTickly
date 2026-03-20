import compatManifestJson from "../generated/compat-manifest.generated.json";
import { resolve } from "node:path";

import {
  getOpenApiRoot,
  loadJsonDocument,
  type OpenApiHeaderObject,
  type OpenApiSchemaObject,
} from "../openapi/schema.ts";
import { validateGeneratedSchemaValue } from "./schema-backed-validator.ts";

const compatSources = [
  "toggl-track-api-v9.swagger.json",
  "toggl-reports-v3.swagger.json",
  "toggl-webhooks-v1.swagger.json",
] as const;

export interface CompatOperationManifestEntry {
  source: (typeof compatSources)[number];
  method: string;
  path: string;
  operationId: string;
}

export interface CompatContractCase {
  source: (typeof compatSources)[number];
  method: string;
  path: string;
  status: number;
  actual: unknown;
  headers?: Record<string, boolean | number | string | null>;
}

export interface CompatContractResult extends CompatContractCase {
  ok: boolean;
  operationId: string;
  errors: string[];
  headerErrors: string[];
  validatedHeaders: string[];
}

interface GeneratedCompatManifest {
  generatedFrom: string[];
  operations: Array<{
    source: (typeof compatSources)[number];
    method: string;
    path: string;
    operationId: string;
    sourceOperationId: string | null;
    responses: Record<
      string,
      {
        bodySchema: OpenApiSchemaObject | null;
        bodySchemaRef: string | null;
        unsupportedKeywords: string[];
        headers: Record<string, OpenApiHeaderObject>;
      }
    >;
  }>;
}

export function loadGeneratedCompatOperationManifest(): GeneratedCompatManifest {
  return compatManifestJson as unknown as GeneratedCompatManifest;
}

export function loadCompatOperationManifest(): CompatOperationManifestEntry[] {
  return loadGeneratedCompatOperationManifest().operations.map((entry) => ({
    source: entry.source,
    method: entry.method,
    path: entry.path,
    operationId: entry.operationId,
  }));
}

export function createSampleQuotaContractCase(): CompatContractCase {
  return {
    source: "toggl-track-api-v9.swagger.json",
    method: "get",
    path: "/me/quota",
    status: 200,
    actual: loadJsonDocument<unknown>(
      resolve(getOpenApiRoot(), "../apps/backend/tests/fixtures/track-get-quota.success.json"),
    ),
  };
}

export function createOrganizationUsersHeaderContractCase(): CompatContractCase {
  return {
    source: "toggl-track-api-v9.swagger.json",
    method: "get",
    path: "/organizations/{organization_id}/users",
    status: 200,
    actual: [],
    headers: {
      "X-Page": 1,
      "X-Page-Size": 50,
      "X-Pages": 1,
      "X-Records": 0,
      "X-Sort-Order": "asc",
    },
  };
}

export function runCompatContractCase(contractCase: CompatContractCase): CompatContractResult {
  const operation = loadGeneratedCompatOperationManifest().operations.find(
    (entry) =>
      entry.source === contractCase.source &&
      entry.path === contractCase.path &&
      entry.method === contractCase.method,
  );

  if (!operation) {
    return {
      ...contractCase,
      ok: false,
      operationId: "",
      errors: [`Missing operation ${contractCase.method.toUpperCase()} ${contractCase.path}`],
      headerErrors: [],
      validatedHeaders: [],
    };
  }

  const responseContract = operation.responses[String(contractCase.status)];
  if (!responseContract) {
    return {
      ...contractCase,
      ok: false,
      operationId: operation.operationId,
      errors: [`Missing ${contractCase.status} schema for ${contractCase.path}`],
      headerErrors: [],
      validatedHeaders: [],
    };
  }

  const unsupportedErrors = responseContract.unsupportedKeywords.map(
    (keyword) =>
      `${contractCase.method.toUpperCase()} ${contractCase.path} uses unsupported schema keyword ${keyword}`,
  );
  const bodyErrors =
    unsupportedErrors.length > 0
      ? unsupportedErrors
      : validateGeneratedSchemaValue(contractCase.actual, responseContract.bodySchema ?? undefined);

  const headerErrors: string[] = [];
  const validatedHeaders: string[] = [];
  for (const [headerName, headerSchema] of Object.entries(responseContract.headers)) {
    const actualHeaderValue = contractCase.headers?.[headerName];
    if (actualHeaderValue === undefined) {
      headerErrors.push(`Missing header ${headerName}`);
      continue;
    }

    const schemaToValidate = headerSchema.schema ?? headerSchema;
    const errors = validateGeneratedSchemaValue(
      actualHeaderValue,
      schemaToValidate,
      `$headers.${headerName}`,
    );

    if (errors.length > 0) {
      headerErrors.push(...errors);
      continue;
    }

    validatedHeaders.push(headerName);
  }

  const errors = [...bodyErrors, ...headerErrors];

  return {
    ...contractCase,
    ok: errors.length === 0,
    operationId: operation.operationId,
    errors,
    headerErrors,
    validatedHeaders,
  };
}
