/* eslint-disable */
// Generated from openapi/opentoggl-shared.openapi.json.
// Do not edit by hand.

export const sharedContractsDocument = {
  openapi: "3.1.0",
  info: {
    title: "OpenToggl Shared Contracts",
    version: "0.0.0",
  },
  components: {
    headers: {
      "X-Toggl-Quota-Remaining": {
        description: "Remaining requests in the current quota window.",
        schema: {
          type: "integer",
        },
      },
      "X-Toggl-Quota-Resets-In": {
        description: "Seconds until the current quota window resets.",
        schema: {
          type: "integer",
        },
      },
      "X-Toggl-Quota-Total": {
        description: "Total requests allowed in the current quota window.",
        schema: {
          type: "integer",
        },
      },
      "X-OpenToggl-Feature-Gate": {
        description: "Capability key used for the current feature-gate decision.",
        schema: {
          type: "string",
        },
      },
    },
    schemas: {
      CapabilityContext: {
        type: "object",
        properties: {
          organization_id: {
            type: "integer",
            nullable: true,
          },
          workspace_id: {
            type: "integer",
            nullable: true,
          },
          scope: {
            type: "string",
            enum: ["instance", "organization", "workspace"],
          },
        },
        required: ["scope"],
      },
      FeatureCapability: {
        type: "object",
        properties: {
          key: {
            type: "string",
          },
          enabled: {
            type: "boolean",
          },
          source: {
            type: "string",
            enum: ["billing", "instance_admin", "platform"],
          },
        },
        required: ["key", "enabled", "source"],
      },
      QuotaWindow: {
        type: "object",
        properties: {
          organization_id: {
            type: "integer",
            nullable: true,
          },
          remaining: {
            type: "integer",
          },
          resets_in_secs: {
            type: "integer",
          },
          total: {
            type: "integer",
          },
        },
        required: ["organization_id", "remaining", "resets_in_secs", "total"],
      },
      FeatureGateDecision: {
        type: "object",
        properties: {
          capability_key: {
            type: "string",
          },
          allowed: {
            type: "boolean",
          },
          reason: {
            type: "string",
            enum: ["allowed", "plan_restricted", "quota_exhausted", "instance_disabled"],
          },
          quota: {
            $ref: "#/components/schemas/QuotaWindow",
            nullable: true,
          },
        },
        required: ["capability_key", "allowed", "reason"],
      },
      CapabilitySnapshot: {
        type: "object",
        properties: {
          context: {
            $ref: "#/components/schemas/CapabilityContext",
          },
          capabilities: {
            type: "array",
            items: {
              $ref: "#/components/schemas/FeatureCapability",
            },
          },
        },
        required: ["context", "capabilities"],
      },
    },
  },
} as const;

export const sharedContractsGeneratedArtifact = {
  source: "openapi/opentoggl-shared.openapi.json",
  schemaNames: [
    "CapabilityContext",
    "FeatureCapability",
    "QuotaWindow",
    "FeatureGateDecision",
    "CapabilitySnapshot",
  ],
  headerNames: [
    "X-Toggl-Quota-Remaining",
    "X-Toggl-Quota-Resets-In",
    "X-Toggl-Quota-Total",
    "X-OpenToggl-Feature-Gate",
  ],
} as const;

export interface SharedContractTypeMap {
  CapabilityContext: CapabilityContext;
  FeatureCapability: FeatureCapability;
  QuotaWindow: QuotaWindow;
  FeatureGateDecision: FeatureGateDecision;
  CapabilitySnapshot: CapabilitySnapshot;
}

export type SharedContractSchemaName = keyof SharedContractTypeMap;

export const capabilityContextSchema = sharedContractsDocument.components.schemas.CapabilityContext;
export const featureCapabilitySchema = sharedContractsDocument.components.schemas.FeatureCapability;
export const quotaWindowSchema = sharedContractsDocument.components.schemas.QuotaWindow;
export const featureGateDecisionSchema =
  sharedContractsDocument.components.schemas.FeatureGateDecision;
export const capabilitySnapshotSchema =
  sharedContractsDocument.components.schemas.CapabilitySnapshot;

export const quotaWindowHeaderSchemas = {
  "X-Toggl-Quota-Remaining": sharedContractsDocument.components.headers["X-Toggl-Quota-Remaining"],
  "X-Toggl-Quota-Resets-In": sharedContractsDocument.components.headers["X-Toggl-Quota-Resets-In"],
  "X-Toggl-Quota-Total": sharedContractsDocument.components.headers["X-Toggl-Quota-Total"],
} as const;

export const featureGateDecisionHeaderSchema =
  sharedContractsDocument.components.headers["X-OpenToggl-Feature-Gate"];

export type CapabilityContext = {
  organization_id?: number | null;
  workspace_id?: number | null;
  scope: "instance" | "organization" | "workspace";
};
export type FeatureCapability = {
  key: string;
  enabled: boolean;
  source: "billing" | "instance_admin" | "platform";
};
export type QuotaWindow = {
  organization_id: number | null;
  remaining: number;
  resets_in_secs: number;
  total: number;
};
export type FeatureGateDecision = {
  capability_key: string;
  allowed: boolean;
  reason: "allowed" | "plan_restricted" | "quota_exhausted" | "instance_disabled";
  quota?: QuotaWindow | null;
};
export type CapabilitySnapshot = { context: CapabilityContext; capabilities: FeatureCapability[] };
