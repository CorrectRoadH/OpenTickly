// Package tracktime centralizes the datetime serialization format used
// by every Toggl-compatible HTTP response in this repo.
//
// Official api.track.toggl.com emits timestamps with an explicit
// numeric UTC offset, e.g. "2024-01-05T05:19:31+00:00". Go's stock
// time.RFC3339 layout abbreviates UTC as "Z" instead, which some
// strict third-party parsers (Rust chrono's strict ISO, typed
// TypeScript SDKs) reject. Every public-facing response path must use
// Layout here instead of time.RFC3339 so the wire format is byte-for-
// byte identical to the upstream API.
package tracktime

import "time"

// Layout is the datetime layout used for all Toggl-compatible response
// fields (at / created_at / updated_at / start / stop / deleted_at).
//
// The "-07:00" placeholder forces Go to emit the numeric offset even
// for UTC times (where the "Z07:00" placeholder used by time.RFC3339
// collapses to "Z"). Apply .UTC() on the value first so we always
// emit +00:00, never a caller-local offset.
const Layout = "2006-01-02T15:04:05-07:00"

// FormatUTC returns t serialized in Layout, normalized to UTC.
func FormatUTC(t time.Time) string {
	return t.UTC().Format(Layout)
}

// FormatUTCPtr returns a pointer to FormatUTC(t). Useful where the
// generated OpenAPI types expect *string. The returned pointer is
// always non-nil — callers with a nullable input should use
// FormatUTCFromPtr instead.
func FormatUTCPtr(t time.Time) *string {
	s := FormatUTC(t)
	return &s
}

// FormatUTCFromPtr returns nil when t is nil, otherwise FormatUTCPtr.
// Matches the common Toggl-response pattern of nullable timestamps
// (server_deleted_at, validated_at, stop while running, ...).
func FormatUTCFromPtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	return FormatUTCPtr(*t)
}
