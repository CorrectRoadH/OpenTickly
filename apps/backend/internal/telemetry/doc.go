// Package telemetry emits anonymous version check-ins to the upstream update
// service so the project can see daily-active-instance and version-distribution
// numbers for self-hosted deployments.
//
// Opt out by setting OPENTOGGL_TELEMETRY=off at startup. When disabled, the
// pinger is never constructed — no goroutine, no network, no DB writes beyond
// the one-time instance_identity seed handled by migration.
package telemetry
