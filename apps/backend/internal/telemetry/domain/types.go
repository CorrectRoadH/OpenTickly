package domain

import (
	"time"

	"github.com/google/uuid"
)

// InstanceID is this self-hosted instance's stable, anonymous identity.
// Persisted in the instance_identity table; generated once on first boot.
type InstanceID uuid.UUID

func (i InstanceID) String() string { return uuid.UUID(i).String() }

func ParseInstanceID(s string) (InstanceID, error) {
	u, err := uuid.Parse(s)
	if err != nil {
		return InstanceID{}, err
	}
	return InstanceID(u), nil
}

// CheckinPayload is serialized into the query string on `GET update.opentoggl.com/?version=…`.
// Keep this structurally aligned with apps/update-worker/src/validation.ts.
type CheckinPayload struct {
	InstanceID InstanceID
	Version    string
	GoVersion  string
	OS         string
	Arch       string
	Locale     string
}

// Announcement mirrors the update-worker Announcement shape.
type Announcement struct {
	ID           string     `json:"id"`
	Title        string     `json:"title"`
	Severity     string     `json:"severity"`
	PublishedAt  time.Time  `json:"publishedAt"`
	ExpiresAt    *time.Time `json:"expiresAt,omitempty"`
	Link         string     `json:"link,omitempty"`
	BodyMarkdown string     `json:"bodyMarkdown"`
}

// Manifest is the response body from the upstream update worker.
// See apps/update-worker/src/types.ts → UpdateResponse for the source of truth.
type Manifest struct {
	LatestVersion   string         `json:"latestVersion"`
	LatestTag       string         `json:"latestTag"`
	UpdateAvailable bool           `json:"updateAvailable"`
	ReleasedAt      *time.Time     `json:"releasedAt,omitempty"`
	ReleaseURL      string         `json:"releaseUrl,omitempty"`
	ReleaseNotes    string         `json:"releaseNotes,omitempty"`
	Announcements   []Announcement `json:"announcements"`
}
