import {
  sharedContractsDocument,
  type CapabilityContext,
  type CapabilitySnapshot,
  type FeatureCapability,
  type FeatureGateDecision,
  type QuotaWindow,
  type SharedContractSchemaName,
  type SharedContractTypeMap,
} from "./generated/public-contracts.generated.ts";

type ValidationPath = Array<string | number>;

type SharedSchema = {
  $ref?: string;
  nullable?: boolean;
  enum?: readonly unknown[];
  type?: string;
  items?: SharedSchema;
  properties?: Record<string, SharedSchema>;
  required?: readonly string[];
  additionalProperties?: boolean | SharedSchema;
};

export class SharedContractValidationError extends TypeError {
  constructor(path: ValidationPath, expectation: string) {
    super(`${formatValidationPath(path)} ${expectation}`);
    this.name = "SharedContractValidationError";
  }
}

function formatValidationPath(path: ValidationPath) {
  if (path.length === 0) {
    return "value";
  }

  return path.reduce((result, segment) => {
    if (typeof segment === "number") {
      return `${result}[${segment}]`;
    }

    return `${result}.${segment}`;
  }, "value");
}

function getSchemaMap() {
  return sharedContractsDocument.components.schemas as Record<string, SharedSchema>;
}

function resolveSchemaRef(ref: string) {
  const prefix = "#/components/schemas/";
  if (!ref.startsWith(prefix)) {
    throw new SharedContractValidationError(
      [],
      `references unsupported schema ${JSON.stringify(ref)}`,
    );
  }

  const schemaName = ref.slice(prefix.length);
  const schema = getSchemaMap()[schemaName];

  if (!schema) {
    throw new SharedContractValidationError([], `references missing schema ${JSON.stringify(ref)}`);
  }

  return schema;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// 这里直接依据生成出的 OpenAPI schema 校验，避免 shared-contracts 再手写一层业务真相。
function assertValidAgainstSchema(
  schema: SharedSchema,
  value: unknown,
  path: ValidationPath,
): void {
  if (schema.nullable && value === null) {
    return;
  }

  if (schema.$ref) {
    assertValidAgainstSchema(resolveSchemaRef(schema.$ref), value, path);
    return;
  }

  if (schema.enum) {
    if (!schema.enum.includes(value)) {
      throw new SharedContractValidationError(
        path,
        `must be one of ${schema.enum.map((entry) => JSON.stringify(entry)).join(", ")}`,
      );
    }
    return;
  }

  switch (schema.type) {
    case "boolean":
      if (typeof value !== "boolean") {
        throw new SharedContractValidationError(path, "must be a boolean");
      }
      return;
    case "integer":
      if (!Number.isInteger(value)) {
        throw new SharedContractValidationError(path, "must be an integer");
      }
      return;
    case "number":
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new SharedContractValidationError(path, "must be a number");
      }
      return;
    case "string":
      if (typeof value !== "string") {
        throw new SharedContractValidationError(path, "must be a string");
      }
      return;
    case "array":
      if (!Array.isArray(value)) {
        throw new SharedContractValidationError(path, "must be an array");
      }

      if (!schema.items) {
        throw new SharedContractValidationError(path, 'is missing an "items" schema');
      }

      value.forEach((entry, index) => {
        assertValidAgainstSchema(schema.items as SharedSchema, entry, [...path, index]);
      });
      return;
    case "object": {
      if (!isPlainObject(value)) {
        throw new SharedContractValidationError(path, "must be an object");
      }

      const properties = schema.properties ?? {};
      const required = new Set(schema.required ?? []);

      for (const key of required) {
        if (!(key in value)) {
          throw new SharedContractValidationError([...path, key], "is required");
        }
      }

      for (const [key, propertySchema] of Object.entries(properties)) {
        if (key in value) {
          assertValidAgainstSchema(propertySchema, value[key], [...path, key]);
        }
      }

      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) {
          if (!(key in properties)) {
            throw new SharedContractValidationError([...path, key], "is not allowed");
          }
        }
      }

      if (schema.additionalProperties && schema.additionalProperties !== true) {
        for (const [key, entry] of Object.entries(value)) {
          if (!(key in properties)) {
            assertValidAgainstSchema(schema.additionalProperties, entry, [...path, key]);
          }
        }
      }

      return;
    }
    default:
      throw new SharedContractValidationError(
        path,
        `uses unsupported schema type ${JSON.stringify(schema.type ?? "undefined")}`,
      );
  }
}

export function parseSharedContract<TSchemaName extends SharedContractSchemaName>(
  schemaName: TSchemaName,
  value: unknown,
): SharedContractTypeMap[TSchemaName] {
  const schema = getSchemaMap()[schemaName];
  assertValidAgainstSchema(schema, value, []);
  return value as SharedContractTypeMap[TSchemaName];
}

export function parseCapabilityContext(value: unknown): CapabilityContext {
  return parseSharedContract("CapabilityContext", value);
}

export function parseFeatureCapability(value: unknown): FeatureCapability {
  return parseSharedContract("FeatureCapability", value);
}

export function parseQuotaWindow(value: unknown): QuotaWindow {
  return parseSharedContract("QuotaWindow", value);
}

export function parseFeatureGateDecision(value: unknown): FeatureGateDecision {
  return parseSharedContract("FeatureGateDecision", value);
}

export function parseCapabilitySnapshot(value: unknown): CapabilitySnapshot {
  return parseSharedContract("CapabilitySnapshot", value);
}
