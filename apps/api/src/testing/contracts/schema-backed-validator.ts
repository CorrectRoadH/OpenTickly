import type { OpenApiSchemaObject } from "../openapi/schema.ts";

function validateObject(value: unknown, schema: OpenApiSchemaObject, path: string): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [`${path} should be an object`];
  }

  const errors: string[] = [];
  const required = new Set(schema.required ?? []);
  const objectValue = value as Record<string, unknown>;

  for (const [propertyName, propertySchema] of Object.entries(schema.properties ?? {})) {
    if (!(propertyName in objectValue)) {
      if (required.has(propertyName)) {
        errors.push(`${path}.${propertyName} is required`);
      }
      continue;
    }

    errors.push(
      ...validateGeneratedSchemaValue(
        objectValue[propertyName],
        propertySchema,
        `${path}.${propertyName}`,
      ),
    );
  }

  return errors;
}

export function validateGeneratedSchemaValue(
  value: unknown,
  schema: OpenApiSchemaObject | undefined,
  path = "$",
): string[] {
  if (!schema) {
    return [];
  }

  if (schema.nullable && value === null) {
    return [];
  }

  if (schema.$ref && !schema.type && !schema.properties && !schema.items) {
    return [`${path} still contains unresolved ref ${schema.$ref}`];
  }

  switch (schema.type) {
    case "array":
      if (!Array.isArray(value)) {
        return [`${path} should be an array`];
      }
      return value.flatMap((entry, index) =>
        validateGeneratedSchemaValue(entry, schema.items, `${path}[${index}]`),
      );
    case "object":
      return validateObject(value, schema, path);
    case "integer":
      return Number.isInteger(value) ? [] : [`${path} should be an integer`];
    case "number":
      return typeof value === "number" ? [] : [`${path} should be a number`];
    case "boolean":
      return typeof value === "boolean" ? [] : [`${path} should be a boolean`];
    case "string":
      if (typeof value !== "string") {
        return [`${path} should be a string`];
      }
      if (schema.enum && !schema.enum.includes(value)) {
        return [`${path} should be one of ${schema.enum.join(", ")}`];
      }
      return [];
    default:
      return schema.properties
        ? validateObject(value, { ...schema, type: "object" }, path)
        : [`${path} uses an unsupported generated schema shape`];
  }
}
