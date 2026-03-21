import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(packageRoot, "../..");
const defaultSourcePath = resolve(repositoryRoot, "openapi/opentoggl-shared.openapi.json");
const defaultTargetPath = resolve(packageRoot, "src/generated/public-contracts.generated.ts");
const sharedSchemaRefMarker = "opentoggl-shared.openapi.json#/components/schemas/";

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

function parseCliArguments(args) {
  let sourcePath = defaultSourcePath;
  let targetPath = defaultTargetPath;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];

    if (argument === "--source") {
      sourcePath = resolve(process.cwd(), value);
      index += 1;
      continue;
    }

    if (argument === "--target") {
      targetPath = resolve(process.cwd(), value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return {
    sourcePath,
    targetPath,
  };
}

function unsupportedSchema(path, detail) {
  return new Error(`Unsupported schema at ${path}: ${detail}`);
}

function refToTypeName(ref) {
  return ref.split("/").at(-1);
}

function toModuleSpecifier(path) {
  const normalizedPath = normalizePath(path);
  return normalizedPath.startsWith(".") ? normalizedPath : `./${normalizedPath}`;
}

function resolveExportSurface(targetPath) {
  if (basename(targetPath) === "web-contracts.generated.ts") {
    return {
      documentName: "webContractsDocument",
      artifactName: "webContractsGeneratedArtifact",
      typeMapName: "WebContractTypeMap",
      schemaNameType: "WebContractSchemaName",
    };
  }

  return {
    documentName: "sharedContractsDocument",
    artifactName: "sharedContractsGeneratedArtifact",
    typeMapName: "SharedContractTypeMap",
    schemaNameType: "SharedContractSchemaName",
  };
}

function sharedImportTypeName(typeName) {
  return `Shared${typeName}`;
}

function refToTypeReference(ref, path) {
  if (ref.startsWith("#/components/schemas/")) {
    return refToTypeName(ref);
  }

  if (ref.includes(sharedSchemaRefMarker)) {
    return sharedImportTypeName(refToTypeName(ref));
  }

  throw unsupportedSchema(path, `external ref "${ref}" is not supported`);
}

function applyNullable(typeSource, schema) {
  return schema.nullable ? `${typeSource} | null` : typeSource;
}

// 共享合同生成必须 fail-closed，避免新关键字被静默降级成 unknown。
function assertSupportedSchema(schema, path) {
  for (const keyword of ["oneOf", "anyOf", "allOf", "not", "if", "then", "else"]) {
    if (keyword in schema) {
      throw unsupportedSchema(path, `keyword "${keyword}" is not supported`);
    }
  }

  if (Array.isArray(schema.type)) {
    throw unsupportedSchema(path, 'union "type" arrays are not supported');
  }

  if (schema.type === "array" && schema.items === undefined) {
    throw unsupportedSchema(path, 'arrays must declare an "items" schema');
  }

  if (schema.type === "object" && schema.additionalProperties !== undefined) {
    throw unsupportedSchema(path, '"additionalProperties" is not supported');
  }
}

function schemaToType(schema, path) {
  assertSupportedSchema(schema, path);

  if (schema.$ref) {
    return applyNullable(refToTypeReference(schema.$ref, path), schema);
  }

  if (schema.type === "array") {
    return applyNullable(`(${schemaToType(schema.items, `${path}.items`)})[]`, schema);
  }

  if (schema.type === "object") {
    const required = new Set(schema.required ?? []);
    const properties = Object.entries(schema.properties ?? {}).map(
      ([name, propertySchema]) =>
        `${JSON.stringify(name)}${required.has(name) ? "" : "?"}: ${schemaToType(
          propertySchema,
          `${path}.properties.${name}`,
        )};`,
    );
    return applyNullable(
      properties.length === 0 ? "Record<string, never>" : `{ ${properties.join(" ")} }`,
      schema,
    );
  }

  if (schema.enum) {
    return applyNullable(schema.enum.map((entry) => JSON.stringify(entry)).join(" | "), schema);
  }

  switch (schema.type) {
    case "integer":
    case "number":
      return applyNullable("number", schema);
    case "boolean":
      return applyNullable("boolean", schema);
    case "string":
      return applyNullable("string", schema);
    default:
      throw unsupportedSchema(path, `type "${schema.type ?? "undefined"}" is not supported`);
  }
}

function collectExternalSchemaRefs(schema, path, refs = new Set()) {
  assertSupportedSchema(schema, path);

  if (schema.$ref) {
    if (!schema.$ref.startsWith("#/components/schemas/")) {
      refs.add(schema.$ref);
    }
    return refs;
  }

  if (schema.type === "array") {
    collectExternalSchemaRefs(schema.items, `${path}.items`, refs);
    return refs;
  }

  if (schema.type === "object") {
    for (const [propertyName, propertySchema] of Object.entries(schema.properties ?? {})) {
      collectExternalSchemaRefs(propertySchema, `${path}.properties.${propertyName}`, refs);
    }
  }

  return refs;
}

const { sourcePath, targetPath } = parseCliArguments(process.argv.slice(2));
const source = JSON.parse(readFileSync(sourcePath, "utf8"));
const sourceLabel = normalizePath(relative(repositoryRoot, sourcePath));

const schemas = source.components?.schemas ?? {};
const headers = source.components?.headers ?? {};
const schemaNames = Object.keys(schemas);
const headerNames = Object.keys(headers);
const exportSurface = resolveExportSurface(targetPath);
const importedTypeSpecifiers = Array.from(
  schemaNames.reduce((refs, schemaName) => {
    collectExternalSchemaRefs(schemas[schemaName], `components.schemas.${schemaName}`, refs);
    return refs;
  }, new Set()),
)
  .map((ref) => {
    const externalRef = String(ref);
    const importedTypeName = refToTypeName(externalRef);
    const importedAlias = refToTypeReference(externalRef, `ref:${externalRef}`);
    return importedTypeName === importedAlias ? null : `${importedTypeName} as ${importedAlias}`;
  })
  .filter(Boolean);
const sharedTypeImportPath = toModuleSpecifier(relative(dirname(targetPath), defaultTargetPath));
const schemaAliasExports = [
  ["capabilityContextSchema", "CapabilityContext"],
  ["featureCapabilitySchema", "FeatureCapability"],
  ["quotaWindowSchema", "QuotaWindow"],
  ["featureGateDecisionSchema", "FeatureGateDecision"],
  ["capabilitySnapshotSchema", "CapabilitySnapshot"],
]
  .filter(([, schemaName]) => schemaNames.includes(schemaName))
  .map(
    ([exportName, schemaName]) =>
      `export const ${exportName} = ${exportSurface.documentName}.components.schemas.${schemaName};`,
  )
  .join("\n");
const quotaHeaderNames = [
  "X-OpenToggl-Quota-Remaining",
  "X-OpenToggl-Quota-Reset-In-Secs",
  "X-OpenToggl-Quota-Total",
];
const quotaHeaderExport = quotaHeaderNames.every((headerName) => headerNames.includes(headerName))
  ? `
export const quotaWindowHeaderSchemas = {
  "X-OpenToggl-Quota-Remaining": ${exportSurface.documentName}.components.headers["X-OpenToggl-Quota-Remaining"],
  "X-OpenToggl-Quota-Reset-In-Secs": ${exportSurface.documentName}.components.headers["X-OpenToggl-Quota-Reset-In-Secs"],
  "X-OpenToggl-Quota-Total": ${exportSurface.documentName}.components.headers["X-OpenToggl-Quota-Total"]
} as const;`
  : "";
const featureGateHeaderExport = headerNames.includes("X-OpenToggl-Feature-Gate")
  ? `
export const featureGateDecisionHeaderSchema =
  ${exportSurface.documentName}.components.headers["X-OpenToggl-Feature-Gate"];`
  : "";

const output = `${importedTypeSpecifiers.length > 0 ? `import type {\n${importedTypeSpecifiers.map((specifier) => `  ${specifier},`).join("\n")}\n} from ${JSON.stringify(sharedTypeImportPath)};\n\n` : ""}/* eslint-disable */
// Generated from ${sourceLabel}.
// Do not edit by hand.

export const ${exportSurface.documentName} = ${JSON.stringify(source, null, 2)} as const;

export const ${exportSurface.artifactName} = {
  source: ${JSON.stringify(sourceLabel)},
  schemaNames: ${JSON.stringify(schemaNames)},
  headerNames: ${JSON.stringify(headerNames)}
} as const;

export interface ${exportSurface.typeMapName} {
${schemaNames.map((schemaName) => `  ${schemaName}: ${schemaName};`).join("\n")}
}

export type ${exportSurface.schemaNameType} = keyof ${exportSurface.typeMapName};

${schemaAliasExports}
${quotaHeaderExport}
${featureGateHeaderExport}

${schemaNames
  .map(
    (schemaName) =>
      `export type ${schemaName} = ${schemaToType(
        schemas[schemaName],
        `components.schemas.${schemaName}`,
      )};`,
  )
  .join("\n")}
`;

mkdirSync(dirname(targetPath), { recursive: true });
writeFileSync(targetPath, output);
