# Webhooks

## Goal

This volume defines the public behavior of Webhooks as an independent product surface, including subscription, filters, validation, delivery, retry, limits, and failure handling.

## Scope

This document defines the product surface of `Webhooks API v1`.

Strict inputs for this document:

- `openapi/toggl-webhooks-v1.swagger.json`
- The corresponding Figma `Integrations / Webhooks` page prototype

## Must Cover Completely

- All public endpoints of Webhooks API v1
- event filters
- limits
- status
- subscriptions CRUD
- ping / validate
- Subscription lifecycle management
- Event filtering semantics
- Validation flow
- Signatures
- Delivery records
- Retry strategy
- Failure deactivation
- Workspace-level limits
- Event exposure rules related to permissions and visibility

## Product Rules

- Webhook cannot bypass the permission model; private projects, member permissions, and workspace boundaries must affect event visibility.
- The public value of Webhook is not only CRUD, but also includes:
  - Event filtering
  - endpoint validation
  - delivery records
  - retry / disable runtime semantics
  - limits / status
- validation, ping, signature, timeout, retry, disable must be formal product behaviors, and must be implemented faithfully according to the referenced OpenAPI and Figma.

## Edge Cases

- When the subscription owner, workspace permissions, or private project visibility changes, the event exposure scope must change accordingly, rather than continuing to send under old permissions.
- The states of manual ping / validate and real delivery must be distinguishable from each other.

## Open Questions

- The precise retry/backoff parameters, timeout thresholds, and noisy subscription thresholds still need to be pinned down further in this PRD and the implementation.
- The event catalog and payload shape still need further convergence into a more complete public definition.

## Page Mapping (Figma / Screenshot)

### Figma Prototype Reading Rules

- The Figma file referenced by this document is `https://www.figma.com/design/IiuYyZAD0bWx9C8BxetnFc/OpenToggl`.
- When reading the Webhooks page prototype, do not enumerate all layers from the metadata of the whole `Page 1` and then guess the entry point; use the `integrations webhooks` page entry point recorded in this volume directly.
- This volume only records the `integrations webhooks` page; other pages under the same Figma page such as timer, project, profile, settings are not covered in this volume.

### Choose MCP Entry by Target Page

- When the first formal Webhooks page is needed, call `integrations webhooks` directly, node `12:3561`.
- If the requirement discusses subscriptions, filters, validation / ping, delivery history, failure attempts, limits, status, or health diagnostics, default to this node.
- If this document already provides a node id, call `get_metadata` / `get_design_context` / `get_screenshot` directly against that node; do not first run full metadata on `Page 1` and then rely on text search to find the page.
- If the target page is not the formal Webhooks page, then this PRD is not the source of MCP entry; return to the corresponding product PRD to retrieve the node.

- `Integrations / Webhooks`
  - Figma: `integrations webhooks`, node `12:3561`
  - Screenshot: No corresponding screenshot at the moment; use Figma as the primary reference
  - Product meaning: This is the only formally supported integration page entry point in the current first version. Although it may be called `Integrations` in the navigation, in the first version it actually carries the `Webhooks` product surface, not a general-purpose integrations marketplace.
  - Implementation requirement: The page needs to directly carry subscriptions, filters, validation / ping, delivery history, failure attempts, limits, status, and health diagnostics; if the UI temporarily retains other integration names, they can only serve as unimplemented placeholders, and must not imply the existence of other unimplemented integration capabilities.

## Web Requirements

The web side must completely carry the formal capabilities of the Webhooks product surface; it is not allowed to keep the formal capabilities defined in this volume as API-only.

Formal pages and entry points on the web side include:

- subscriptions list
- Create / edit
- filters configuration
- validation / ping
- delivery history
- failure attempts
- limits
- status
- Health diagnostics page
