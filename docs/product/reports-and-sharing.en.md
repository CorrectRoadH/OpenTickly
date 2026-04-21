# Reports and Sharing

## Goal

This volume defines the visible behavior of reports as an independent product surface, including query, export, shared report, saved report, and the permission model.

## Scope

This document defines:

- `Reports API v3`
- detailed / summary / weekly / trends / profitability / insights
- saved reports
- shared reports
- exports

Strict inputs for this document:

- `openapi/toggl-reports-v3.swagger.json`
- The corresponding Figma reports page prototypes

## Must Cover Completely

- All public endpoints of `Reports API v3`
- detailed reports
- summary reports
- weekly reports
- comparative / trends / profitability / insights
- saved reports
- shared reports
- filters and search capabilities
- Filter and search interfaces for clients / projects / users / time_entries, etc.
- CSV / PDF / XLSX export
- Share token and shared access control
- Report pagination, sorting, aggregation
- Statistical caliber such as timezone day-cutting, rounding, profit, exchange rate
- Read-back consistency with Track data

## Product Rules

- Reports is an independent product surface, not an auxiliary query page of the Track API.
- Reports results that users see in Web and API must be explained based on the same set of public statistical rules.
- exports is not "another implementation", but another result expression of the same query definition.
- shared report, saved report, online query, and export results must share the same set of permissions and parameter semantics.

## Shared / Saved Reports

- saved reports and shared reports must exist as public product objects.
- public/private permissions, parameter overrides, owner inactivation, shared export, and other public behaviors must be implemented faithfully according to the referenced OpenAPI and Figma.

## Edge Cases

- After historical objects are disabled, deleted, or archived, reports by default continue to count the relevant historical facts, rather than silently erasing them.

## Open Questions

- The public failure thresholds of shared reports under extremely large reports and extremely long time ranges still need further collection.
- Some profitability / insights boundary calculation details still need further convergence into this PRD and the implementation.

## Web Requirements

The web side must completely carry the formal product capabilities defined in this volume; no formal capability defined in this volume is allowed to remain API-only.

Formal pages and entry points on the web side include:

- Detailed reports
- Summary reports
- Weekly reports
- Trends / profitability / insights pages
- Saved reports
- Share settings
- Filter and export entry points
