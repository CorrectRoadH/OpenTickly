package admin

import (
	"context"
	"net/http"
	"time"

	"opentoggl/backend/apps/backend/internal/buildinfo"
	adminapi "opentoggl/backend/apps/backend/internal/http/generated/admin"
	telemetrydomain "opentoggl/backend/apps/backend/internal/telemetry/domain"

	"github.com/labstack/echo/v4"
)

const (
	githubRepo         = "CorrectRoadH/OpenTickly"
	fallbackChangelog  = "https://github.com/" + githubRepo + "/blob/main/CHANGELOG.md"
	upstreamCheckTTL   = 3 * time.Second
)

// CurrentVersion is the legacy entrypoint for the compiled-in version string.
// Kept for tests that set it directly; production code should prefer
// buildinfo.Version, which main.go mirrors to both locations.
var CurrentVersion = "dev"

// UpdateFeed is the admin-transport's read surface over the upstream update
// worker. Implemented by *telemetry/application.Pinger; substituted in tests.
//
// SendOnce posts a fresh check-in and returns the upstream manifest. Callers
// must pass a bounded context so a slow upstream never stalls the admin UI.
//
// LatestManifest returns the most recent successful manifest, or false if no
// check-in has succeeded this process lifetime. Used as a graceful fallback
// when SendOnce hits the network-timeout budget.
type UpdateFeed interface {
	SendOnce(ctx context.Context) (telemetrydomain.Manifest, error)
	LatestManifest() (telemetrydomain.Manifest, bool)
}

func (h *Handler) GetInstanceVersion(ctx echo.Context) error {
	current := currentVersion()
	resp := adminapi.InstanceVersion{
		CurrentVersion:  current,
		UpdateAvailable: false,
		ChangelogUrl:    fallbackChangelog,
		Announcements:   []adminapi.InstanceAnnouncement{},
	}

	manifest, ok := h.fetchManifest(ctx.Request().Context())
	if !ok {
		return ctx.JSON(http.StatusOK, resp)
	}

	applyManifest(&resp, manifest, current)
	return ctx.JSON(http.StatusOK, resp)
}

// fetchManifest tries a bounded live check-in first, falling back to the
// pinger's in-memory cache if the upstream is slow or unreachable.
func (h *Handler) fetchManifest(parent context.Context) (telemetrydomain.Manifest, bool) {
	if h.updateFeed == nil {
		return telemetrydomain.Manifest{}, false
	}

	timeoutCtx, cancel := context.WithTimeout(parent, upstreamCheckTTL)
	defer cancel()
	if m, err := h.updateFeed.SendOnce(timeoutCtx); err == nil {
		return m, true
	}

	if m, ok := h.updateFeed.LatestManifest(); ok {
		return m, true
	}
	return telemetrydomain.Manifest{}, false
}

func applyManifest(dst *adminapi.InstanceVersion, m telemetrydomain.Manifest, current string) {
	latest := m.LatestVersion
	if latest == "" {
		latest = m.LatestTag
	}
	if latest != "" {
		dst.LatestVersion = &latest
		dst.UpdateAvailable = latest != current
	}
	// Use the latest release page as the "what's new" link. Falls back to the
	// repo-level CHANGELOG when the upstream manifest didn't carry a release URL.
	if m.ReleaseURL != "" {
		dst.ChangelogUrl = m.ReleaseURL
	}
	if m.ReleasedAt != nil && !m.ReleasedAt.IsZero() {
		rt := *m.ReleasedAt
		dst.ReleasedAt = &rt
	}
	dst.Announcements = mapAnnouncements(m.Announcements)
}

func mapAnnouncements(src []telemetrydomain.Announcement) []adminapi.InstanceAnnouncement {
	out := make([]adminapi.InstanceAnnouncement, 0, len(src))
	for _, a := range src {
		item := adminapi.InstanceAnnouncement{
			Id:           a.ID,
			Title:        a.Title,
			Severity:     adminapi.InstanceAnnouncementSeverity(a.Severity),
			PublishedAt:  a.PublishedAt,
			BodyMarkdown: a.BodyMarkdown,
		}
		if a.ExpiresAt != nil && !a.ExpiresAt.IsZero() {
			exp := *a.ExpiresAt
			item.ExpiresAt = &exp
		}
		if a.Link != "" {
			link := a.Link
			item.Link = &link
		}
		out = append(out, item)
	}
	return out
}

// currentVersion prefers the canonical buildinfo global, with the legacy
// package-level override as a fallback for tests that pre-date it.
func currentVersion() string {
	if buildinfo.Version != "" && buildinfo.Version != "dev" {
		return buildinfo.Version
	}
	if CurrentVersion != "" {
		return CurrentVersion
	}
	return buildinfo.Version
}
