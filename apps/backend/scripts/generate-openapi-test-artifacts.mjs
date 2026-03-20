import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const appRoot = resolve(import.meta.dirname, "..");
const repoRoot = resolve(appRoot, "../..");
const openApiRoot = resolve(repoRoot, "openapi");
const targetRoot = resolve(appRoot, "src/testing/generated");

const compatSources = [
  "toggl-track-api-v9.swagger.json",
  "toggl-reports-v3.swagger.json",
  "toggl-webhooks-v1.swagger.json",
];

const customSources = [
  "opentoggl-web.openapi.json",
  "opentoggl-import.openapi.json",
  "opentoggl-admin.openapi.json",
];

const unsupportedKeywords = [
  "allOf",
  "anyOf",
  "oneOf",
  "not",
  "additionalProperties",
  "patternProperties",
  "dependentSchemas",
  "if",
  "then",
  "else",
];

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function pointerSegments(pointer) {
  return pointer
    .replace(/^#\//, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function resolveJsonPointer(target, pointer) {
  let current = target;
  for (const segment of pointerSegments(pointer)) {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      throw new Error(`Unable to resolve JSON pointer "${pointer}"`);
    }
    current = current[segment];
  }
  return current;
}

function resolveRefTarget(ref, document, filePath) {
  const [filePart, pointerPart = ""] = ref.split("#", 2);
  if (!filePart) {
    return {
      value: resolveJsonPointer(document, pointerPart ? `#${pointerPart}` : "#"),
      document,
      filePath,
    };
  }

  const externalPath = resolve(dirname(filePath), filePart);
  const externalDocument = loadJson(externalPath);
  return {
    value: resolveJsonPointer(externalDocument, pointerPart ? `#${pointerPart}` : "#"),
    document: externalDocument,
    filePath: externalPath,
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resolveSchema(schema, document, filePath, seenRefs = new Set()) {
  if (!schema) {
    return undefined;
  }

  if (schema.$ref) {
    if (seenRefs.has(schema.$ref)) {
      return { $ref: schema.$ref };
    }

    const nextSeenRefs = new Set(seenRefs);
    nextSeenRefs.add(schema.$ref);
    const target = resolveRefTarget(schema.$ref, document, filePath);
    const resolved = clone(target.value);
    return {
      ...resolveSchema(resolved, target.document, target.filePath, nextSeenRefs),
      $ref: schema.$ref,
    };
  }

  const resolved = clone(schema);
  if (resolved.items) {
    resolved.items = resolveSchema(resolved.items, document, filePath, seenRefs);
  }

  if (resolved.properties) {
    resolved.properties = Object.fromEntries(
      Object.entries(resolved.properties).map(([key, value]) => [
        key,
        resolveSchema(value, document, filePath, seenRefs),
      ]),
    );
  }

  return resolved;
}

function collectUnsupportedKeywords(schema, prefix = "$") {
  if (!schema || typeof schema !== "object") {
    return [];
  }

  const issues = unsupportedKeywords
    .filter((keyword) => keyword in schema)
    .map((keyword) => `${prefix}.${keyword}`);

  const propertyIssues = Object.entries(schema.properties ?? {}).flatMap(([key, value]) =>
    collectUnsupportedKeywords(value, `${prefix}.properties.${key}`),
  );
  const itemIssues = schema.items
    ? collectUnsupportedKeywords(schema.items, `${prefix}.items`)
    : [];

  return [...issues, ...propertyIssues, ...itemIssues];
}

function synthesizeOperationId(method, path) {
  return `${method}-${path
    .replace(/[{}]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function generateManifest(sources) {
  return {
    generatedFrom: sources.map((source) => `openapi/${source}`),
    operations: sources.flatMap((source) => {
      const filePath = resolve(openApiRoot, source);
      const document = loadJson(filePath);

      return Object.entries(document.paths ?? {}).flatMap(([path, operations]) =>
        Object.entries(operations).map(([method, operation]) => ({
          source,
          path,
          method,
          operationId: operation.operationId || synthesizeOperationId(method, path),
          sourceOperationId: operation.operationId || null,
          responses: Object.fromEntries(
            Object.entries(operation.responses ?? {}).map(([status, response]) => {
              const bodySchema =
                response.schema ??
                response.content?.["application/json"]?.schema ??
                Object.values(response.content ?? {})[0]?.schema;
              const resolvedBodySchema = bodySchema
                ? resolveSchema(bodySchema, document, filePath)
                : null;

              const headers = Object.fromEntries(
                Object.entries(response.headers ?? {}).map(([headerName, headerSchema]) => {
                  if (headerSchema.$ref) {
                    const target = resolveRefTarget(headerSchema.$ref, document, filePath);
                    return [
                      headerName,
                      {
                        ...target.value,
                        $ref: headerSchema.$ref,
                      },
                    ];
                  }
                  return [headerName, headerSchema];
                }),
              );

              return [
                status,
                {
                  bodySchema: resolvedBodySchema,
                  bodySchemaRef: bodySchema?.$ref ?? null,
                  unsupportedKeywords: collectUnsupportedKeywords(resolvedBodySchema),
                  headers,
                },
              ];
            }),
          ),
        })),
      );
    }),
  };
}

mkdirSync(targetRoot, { recursive: true });
writeFileSync(
  resolve(targetRoot, "compat-manifest.generated.json"),
  `${JSON.stringify(generateManifest(compatSources), null, 2)}\n`,
);
writeFileSync(
  resolve(targetRoot, "custom-manifest.generated.json"),
  `${JSON.stringify(generateManifest(customSources), null, 2)}\n`,
);
