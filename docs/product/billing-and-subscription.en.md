# Billing and Subscription

## Goal

This volume defines how the public business capabilities of plan, subscription, invoice, customer, quota, and feature exposure are expressed.

## Scope

This document defines:

- billing / subscription / invoice / customer / plan / quota

Strict inputs for this document:

- The corresponding billing-related OpenAPI definitions
- The corresponding Figma billing / subscription page prototypes

## Must Cover Completely

- Subscription plans
- plan states
- customer-related public objects
- Billing
- Invoices
- Plan capabilities and feature exposure
- Quotas and limits
- Quota response headers and related behavior
- Workspace / organization and plan association semantics
- Even if the underlying billing implementation differs, the externally exposed objects and state expressions must remain consistent

## Product Constraints

- Billing and subscription are not optional auxiliary features; they are a formal part of the current public API.
- Organization-level / workspace-level subscription views, customer, invoice, payment, quota, feature gating, and other specific public behaviors must be implemented faithfully according to the referenced OpenAPI and Figma.

## Product Rules

- Both organization and workspace may expose subscription-related public entry points, but the business truth of subscription is only one set; it must not be implemented as two sources of truth.
- The source of truth for feature gating is defined by billing; each business module is only responsible for checking in its own use case; the returned semantics and headers rules must be implemented faithfully according to the referenced OpenAPI.
- Even if self-hosted does not have an official SaaS payment backend, the public objects and state expressions of plan / subscription / invoice / customer / quota must still exist.

## Edge Cases

- The workspace-level subscription view is by default understood as the public expression of an organization-level contract from the workspace perspective.
- How to handle existing over-quota objects after a plan downgrade must follow a fixed rule; do not silently delete historical objects by default.

## Open Questions

- Field details and state combinations for some low-frequency billing endpoints still need to be confirmed further from public sources.
- Field differences of seat / plan / quota in certain organization-level and workspace-level views still need further verification.

## Web Requirements

The web side must completely carry the formal product capabilities defined in this volume; no formal capability defined in this volume is allowed to remain API-only.

Formal pages and entry points on the web side include:

- Billing management page
- Subscription management page
- Plans / limits view page
- Invoice list and download page
- Payment-related status page
- Customer edit page
- Quota view page
