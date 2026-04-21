# OpenToggl Product Definition

## Goals

The goal of `OpenToggl` is not to build a "Toggl-like" time tracking tool, but to directly define OpenToggl's own product according to Toggl's current public product surface.

The first formal version is defined directly as:

- Covers `Track API v9`
- Covers `Reports API v3`
- Covers `Webhooks API v1`
- Provides a complete Web interface corresponding to these public APIs
- Supports both cloud SaaS and self-hosted, with the same feature surface on both
- Supports importing Toggl export data, as a new business capability in the first version beyond Toggl's current public business product surface
- Provides instance-level management and platform operations capabilities, as OpenToggl's own host-capability surface

## Definition Method

OpenToggl does not treat "compatibility" as an additional goal; it directly takes Toggl's current public definition as the source of truth for its own product definition.
The product and acceptance wording for this repository is uniformly stated as: faithfully implement per the referenced PRDs, OpenAPI, and Figma.

The first-version product definition uses the following input responsibilities:

- `docs/product/*.md` is the default reading entry point
- `openapi/*.json` is the strong-constraint source for the API public definition
- Figma prototypes are the strong-constraint source for the UI interface and interaction public definition
- A PRD must explicitly reference the relevant OpenAPI and Figma
- A PRD only supplements the functional details that OpenAPI and Figma cannot fully express

In other words, the following are all defined directly by the upstream public definition:

- Paths and HTTP methods
- Request parameters, filter, sort, pagination semantics
- Request and response bodies
- Authentication
- Error codes and key error semantics
- Rate limiting and quota expression
- Report statistical semantics
- Webhook lifecycle and runtime behavior
- Subscription, billing, invoicing, quota and other operations and commercial interfaces
- Corresponding features and operation flows on the Web interface

When handling requirements, by default read the corresponding PRD first; only dig into the OpenAPI or Figma referenced by the PRD when you need to precisely implement an API or UI detail.

Product documentation does not re-copy OpenAPI or Figma itself; it only defines product details not fully covered by either but which the implementation must respect.

## Product Volumes

The product definition is split by functionality; it is no longer centrally maintained in a single PRD:

- [identity-and-tenant](../product/identity-and-tenant.md)
- [membership-and-access](../product/membership-and-access.md)
- [tracking](../product/tracking.md)
- [reports-and-sharing](../product/reports-and-sharing.md)
- [Webhooks](../product/Webhooks.md)
- [billing-and-subscription](../product/billing-and-subscription.md)
- [importing](../product/importing.md)
- [instance-admin](../product/instance-admin.md)
- [landing](../product/landing.md)

## Upstream Inputs

When writing a PRD, it should reference:

- `openapi/toggl-track-api-v9.swagger.json`
- `openapi/toggl-reports-v3.swagger.json`
- `openapi/toggl-webhooks-v1.swagger.json`
- The OpenToggl Figma prototype

## Common Product Principles

- In the first version, low-frequency capabilities, admin capabilities, and operations capabilities must not be left API-only.
- Public definitions take precedence over internal implementation naming and storage models.
- The self-hosted version and the cloud version share the same public contract and feature surface.
- Except for `import`, the first version does not promise new business features beyond Toggl's current public business product surface.
- `instance-admin` is part of OpenToggl's own instance / host capabilities and is not counted in the above limitation on the business product surface.
- AI/automation-related promises are limited to public OpenAPI, CLI, and skill interface friendliness; no additional independent AI API product surface is promised.

## Terminology

- The completion criterion in this project is "faithfully implement per the referenced public definition", not "claim to be compatible with some vague object".

## Version Alignment

- The first version makes a full alignment promise against the current public baseline.
- Subsequent versions continuously track Toggl's official public changes.
- Every change should first update the OpenAPI, Figma, or the corresponding PRD, then enter domain modeling and implementation planning.
