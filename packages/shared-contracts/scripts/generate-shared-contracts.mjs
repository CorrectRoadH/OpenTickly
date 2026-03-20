import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(packageRoot, "../..");
const defaultSourcePath = resolve(repositoryRoot, "openapi/opentoggl-shared.openapi.json");
const defaultTargetPath = resolve(packageRoot, "src/generated/public-contracts.generated.ts");

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
    return applyNullable(refToTypeName(schema.$ref), schema);
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

const { sourcePath, targetPath } = parseCliArguments(process.argv.slice(2));
const source = JSON.parse(readFileSync(sourcePath, "utf8"));
const sourceLabel = normalizePath(relative(repositoryRoot, sourcePath));

const schemaNames = Object.keys(source.components.schemas);
const headerNames = Object.keys(source.components.headers);

const output = `/* eslint-disable */
// Generated from ${sourceLabel}.
// Do not edit by hand.

export const sharedContractsDocument = ${JSON.stringify(source, null, 2)} as const;

export const sharedContractsGeneratedArtifact = {
  source: ${JSON.stringify(sourceLabel)},
  schemaNames: ${JSON.stringify(schemaNames)},
  headerNames: ${JSON.stringify(headerNames)}
} as const;

export interface SharedContractTypeMap {
${schemaNames.map((schemaName) => `  ${schemaName}: ${schemaName};`).join("\n")}
}

export type SharedContractSchemaName = keyof SharedContractTypeMap;

export const capabilityContextSchema = sharedContractsDocument.components.schemas.CapabilityContext;
export const featureCapabilitySchema = sharedContractsDocument.components.schemas.FeatureCapability;
export const quotaWindowSchema = sharedContractsDocument.components.schemas.QuotaWindow;
export const featureGateDecisionSchema = sharedContractsDocument.components.schemas.FeatureGateDecision;
export const capabilitySnapshotSchema = sharedContractsDocument.components.schemas.CapabilitySnapshot;

export const quotaWindowHeaderSchemas = {
  "X-OpenToggl-Quota-Remaining": sharedContractsDocument.components.headers["X-OpenToggl-Quota-Remaining"],
  "X-OpenToggl-Quota-Reset-In-Secs": sharedContractsDocument.components.headers["X-OpenToggl-Quota-Reset-In-Secs"],
  "X-OpenToggl-Quota-Total": sharedContractsDocument.components.headers["X-OpenToggl-Quota-Total"]
} as const;

export const featureGateDecisionHeaderSchema =
  sharedContractsDocument.components.headers["X-OpenToggl-Feature-Gate"];

${schemaNames
  .map(
    (schemaName) =>
      `export type ${schemaName} = ${schemaToType(
        source.components.schemas[schemaName],
        `components.schemas.${schemaName}`,
      )};`,
  )
  .join("\n")}
`;

mkdirSync(dirname(targetPath), { recursive: true });
writeFileSync(targetPath, output);
