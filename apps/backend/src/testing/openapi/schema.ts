import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface OpenApiSchemaObject {
  $ref?: string;
  type?: string;
  nullable?: boolean;
  enum?: string[];
  required?: string[];
  properties?: Record<string, OpenApiSchemaObject>;
  items?: OpenApiSchemaObject;
}

export interface OpenApiHeaderObject extends OpenApiSchemaObject {
  description?: string;
  schema?: OpenApiSchemaObject;
}

export interface OpenApiResponseObject {
  schema?: OpenApiSchemaObject;
  content?: Record<string, { schema?: OpenApiSchemaObject }>;
  headers?: Record<string, OpenApiHeaderObject>;
}

export interface OpenApiOperationObject {
  operationId?: string;
  responses?: Record<string, OpenApiResponseObject>;
}

export interface OpenApiDocument {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
  };
  paths?: Record<string, Record<string, OpenApiOperationObject>>;
  components?: {
    schemas?: Record<string, OpenApiSchemaObject>;
    headers?: Record<string, OpenApiHeaderObject>;
  };
  definitions?: Record<string, OpenApiSchemaObject>;
}

const workspaceRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const openApiRoot = resolve(workspaceRoot, "openapi");

export function getWorkspaceRoot(): string {
  return workspaceRoot;
}

export function getOpenApiRoot(): string {
  return openApiRoot;
}

export function loadJsonDocument<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function loadOpenApiDocument(filePath: string): OpenApiDocument {
  return loadJsonDocument<OpenApiDocument>(filePath);
}

export function resolveJsonPointer(target: unknown, pointer: string): unknown {
  const segments = pointer
    .replace(/^#\//, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current = target;
  for (const segment of segments) {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      throw new Error(`Unable to resolve JSON pointer segment "${segment}"`);
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function resolveExternalJsonRef(ref: string, baseFilePath: string): unknown {
  const [filePart, pointerPart = ""] = ref.split("#", 2);
  const externalPath = resolve(dirname(baseFilePath), filePart);
  const externalDocument = loadJsonDocument<unknown>(externalPath);

  return resolveJsonPointer(externalDocument, pointerPart ? `#${pointerPart}` : "#");
}

export function resolveSchemaRef(
  ref: string,
  document: OpenApiDocument,
  baseFilePath: string,
): OpenApiSchemaObject {
  const [filePart, pointerPart = ""] = ref.split("#", 2);

  if (!filePart) {
    return resolveJsonPointer(
      document,
      pointerPart ? `#${pointerPart}` : "#",
    ) as OpenApiSchemaObject;
  }

  return resolveExternalJsonRef(ref, baseFilePath) as OpenApiSchemaObject;
}
