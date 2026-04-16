package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	adminapi "opentoggl/backend/apps/backend/internal/http/generated/admin"
	telemetrydomain "opentoggl/backend/apps/backend/internal/telemetry/domain"

	"github.com/labstack/echo/v4"
)

type fakeFeed struct {
	sendManifest telemetrydomain.Manifest
	sendErr      error
	cached       *telemetrydomain.Manifest
	sendCalls    int
}

func (f *fakeFeed) SendOnce(_ context.Context) (telemetrydomain.Manifest, error) {
	f.sendCalls++
	return f.sendManifest, f.sendErr
}

func (f *fakeFeed) LatestManifest() (telemetrydomain.Manifest, bool) {
	if f.cached == nil {
		return telemetrydomain.Manifest{}, false
	}
	return *f.cached, true
}

func callVersion(t *testing.T, h *Handler) adminapi.InstanceVersion {
	t.Helper()
	e := echo.New()
	rec := httptest.NewRecorder()
	ctx := e.NewContext(httptest.NewRequest(http.MethodGet, "/admin/v1/version", nil), rec)
	if err := h.GetInstanceVersion(ctx); err != nil {
		t.Fatalf("GetInstanceVersion: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var resp adminapi.InstanceVersion
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	return resp
}

func TestGetInstanceVersion_NoFeed_ReturnsCompiledVersionOnly(t *testing.T) {
	CurrentVersion = "0.1.0"
	t.Cleanup(func() { CurrentVersion = "dev" })

	h := &Handler{}
	resp := callVersion(t, h)

	if resp.CurrentVersion != "0.1.0" {
		t.Errorf("got CurrentVersion %q, want 0.1.0", resp.CurrentVersion)
	}
	if resp.UpdateAvailable {
		t.Errorf("UpdateAvailable = true, want false (no feed)")
	}
	if len(resp.Announcements) != 0 {
		t.Errorf("expected empty announcements, got %d", len(resp.Announcements))
	}
	if resp.ChangelogUrl == "" {
		t.Errorf("ChangelogUrl must always be populated (fallback URL)")
	}
}

func TestGetInstanceVersion_LiveManifestWins(t *testing.T) {
	CurrentVersion = "0.1.0"
	t.Cleanup(func() { CurrentVersion = "dev" })

	published := time.Date(2026, 4, 16, 0, 0, 0, 0, time.UTC)
	released := time.Date(2026, 4, 16, 12, 0, 0, 0, time.UTC)
	feed := &fakeFeed{
		sendManifest: telemetrydomain.Manifest{
			LatestVersion: "0.2.0",
			LatestTag:     "0.2.0",
			ChangelogURL:  "https://example.test/CHANGELOG.md",
			ReleasedAt:    &released,
			Announcements: []telemetrydomain.Announcement{
				{
					ID:           "ann-1",
					Title:        "Hello",
					Severity:     "info",
					PublishedAt:  published,
					Link:         "https://example.test/ann-1",
					BodyMarkdown: "body",
				},
			},
		},
	}
	h := &Handler{updateFeed: feed}
	resp := callVersion(t, h)

	if resp.LatestVersion == nil || *resp.LatestVersion != "0.2.0" {
		t.Fatalf("LatestVersion = %v, want 0.2.0", resp.LatestVersion)
	}
	if !resp.UpdateAvailable {
		t.Errorf("UpdateAvailable should be true when client lags")
	}
	if resp.ChangelogUrl != "https://example.test/CHANGELOG.md" {
		t.Errorf("ChangelogUrl = %q", resp.ChangelogUrl)
	}
	if resp.ReleasedAt == nil || !resp.ReleasedAt.Equal(released) {
		t.Errorf("ReleasedAt = %v, want %v", resp.ReleasedAt, released)
	}
	if len(resp.Announcements) != 1 || resp.Announcements[0].Id != "ann-1" {
		t.Fatalf("Announcements = %+v", resp.Announcements)
	}
	if resp.Announcements[0].Link == nil || *resp.Announcements[0].Link != "https://example.test/ann-1" {
		t.Errorf("Link not mapped")
	}
	if resp.Announcements[0].Severity != adminapi.InstanceAnnouncementSeverity("info") {
		t.Errorf("Severity = %v", resp.Announcements[0].Severity)
	}
}

func TestGetInstanceVersion_FallsBackToCachedOnSendError(t *testing.T) {
	CurrentVersion = "0.1.0"
	t.Cleanup(func() { CurrentVersion = "dev" })

	cached := telemetrydomain.Manifest{LatestVersion: "0.3.0", LatestTag: "0.3.0"}
	feed := &fakeFeed{
		sendErr: errors.New("network down"),
		cached:  &cached,
	}
	h := &Handler{updateFeed: feed}
	resp := callVersion(t, h)

	if resp.LatestVersion == nil || *resp.LatestVersion != "0.3.0" {
		t.Fatalf("expected cached 0.3.0, got %v", resp.LatestVersion)
	}
	if feed.sendCalls != 1 {
		t.Errorf("expected SendOnce to be attempted once, got %d", feed.sendCalls)
	}
}

func TestGetInstanceVersion_NoManifestAtAll_ReturnsFallback(t *testing.T) {
	CurrentVersion = "0.1.0"
	t.Cleanup(func() { CurrentVersion = "dev" })

	feed := &fakeFeed{sendErr: errors.New("down")}
	h := &Handler{updateFeed: feed}
	resp := callVersion(t, h)

	if resp.LatestVersion != nil {
		t.Errorf("LatestVersion should be nil when feed has no data, got %v", *resp.LatestVersion)
	}
	if resp.UpdateAvailable {
		t.Errorf("UpdateAvailable = true without manifest, want false")
	}
}
