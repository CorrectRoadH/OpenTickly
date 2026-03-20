import customManifestJson from "../generated/custom-manifest.generated.json";
import { resolve } from "node:path";

import {
  getOpenApiRoot,
  loadJsonDocument,
  resolveExternalJsonRef,
  type OpenApiHeaderObject,
  type OpenApiDocument,
  type OpenApiSchemaObject,
} from "./schema.ts";

const customDocuments = [
  "opentoggl-web.openapi.json",
  "opentoggl-import.openapi.json",
  "opentoggl-admin.openapi.json",
] as const;

export interface LoadedCustomDocument {
  source: (typeof customDocuments)[number];
  document: OpenApiDocument;
  filePath: string;
}

export interface GeneratedOperationManifest {
  generatedFrom: string[];
  operations: Array<{
    source: string;
    path: string;
    method: string;
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

export function loadOpenTogglDocuments(): LoadedCustomDocument[] {
  const openApiRoot = getOpenApiRoot();
  return customDocuments.map((source) => {
    const filePath = resolve(openApiRoot, source);
    return {
      source,
      document: loadJsonDocument<OpenApiDocument>(filePath),
      filePath,
    };
  });
}

export function loadGeneratedCustomOperationManifest(): GeneratedOperationManifest {
  return customManifestJson as unknown as GeneratedOperationManifest;
}

export function resolveExternalSchemaRef(ref: string | undefined): OpenApiSchemaObject | undefined {
  if (!ref) {
    return undefined;
  }

  return resolveExternalJsonRef(
    ref,
    resolve(getOpenApiRoot(), "opentoggl-web.openapi.json"),
  ) as OpenApiSchemaObject;
}

export function resolveExternalHeaderRef(ref: string | undefined): OpenApiHeaderObject | undefined {
  if (!ref) {
    return undefined;
  }

  return resolveExternalJsonRef(
    ref,
    resolve(getOpenApiRoot(), "opentoggl-web.openapi.json"),
  ) as OpenApiHeaderObject;
}
