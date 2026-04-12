package tracktime

import (
	"strings"
	"testing"
	"time"
)

func TestFormatUTCMatchesOfficialTogglShape(t *testing.T) {
	// Reference value taken verbatim from a live GET /me/projects
	// response on api.track.toggl.com. If FormatUTC ever drifts from
	// this, we are no longer byte-compatible with official Toggl.
	got := FormatUTC(time.Date(2024, 1, 5, 5, 19, 31, 0, time.UTC))
	want := "2024-01-05T05:19:31+00:00"
	if got != want {
		t.Fatalf("FormatUTC UTC shape drift: want %q got %q", want, got)
	}
}

func TestFormatUTCNormalizesCallerLocalTime(t *testing.T) {
	// A caller that forgot to .UTC() the input must still get +00:00
	// on the wire — the helper owns the normalization.
	jst := time.FixedZone("JST", 9*60*60)
	got := FormatUTC(time.Date(2024, 1, 5, 14, 19, 31, 0, jst))
	if !strings.HasSuffix(got, "+00:00") {
		t.Fatalf("FormatUTC must emit +00:00 offset, got %q", got)
	}
	// Parsed back, it should round-trip to the original instant.
	parsed, err := time.Parse(Layout, got)
	if err != nil {
		t.Fatalf("parse own output: %v", err)
	}
	if !parsed.Equal(time.Date(2024, 1, 5, 5, 19, 31, 0, time.UTC)) {
		t.Fatalf("round-trip drift: got %v", parsed)
	}
}

func TestFormatUTCNeverEmitsZShortcut(t *testing.T) {
	// Z shortcut is what caused the original wire drift: Go's
	// time.RFC3339 prints "Z" for UTC while official emits "+00:00".
	// Fail loudly if anything in this helper regresses to "Z".
	got := FormatUTC(time.Date(2030, 6, 15, 12, 0, 0, 0, time.UTC))
	if strings.HasSuffix(got, "Z") {
		t.Fatalf("FormatUTC must not end in Z, got %q", got)
	}
}

func TestFormatUTCFromPtr(t *testing.T) {
	if got := FormatUTCFromPtr(nil); got != nil {
		t.Fatalf("nil input must return nil, got %v", *got)
	}
	now := time.Date(2024, 1, 5, 5, 19, 31, 0, time.UTC)
	got := FormatUTCFromPtr(&now)
	if got == nil || *got != "2024-01-05T05:19:31+00:00" {
		t.Fatalf("non-nil input drift: got %v", got)
	}
}
