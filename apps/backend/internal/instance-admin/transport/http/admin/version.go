package admin

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	adminapi "opentoggl/backend/apps/backend/internal/http/generated/admin"

	"github.com/labstack/echo/v4"
)

const (
	githubRepo     = "CorrectRoadH/opentoggl"
	changelogURL   = "https://github.com/" + githubRepo + "/blob/main/CHANGELOG.md"
	releasesAPIURL = "https://api.github.com/repos/" + githubRepo + "/releases/latest"
)

// CurrentVersion is set by main.go from the build-time ldflags value.
// Falls back to "dev" if not set.
var CurrentVersion = "dev"

func (h *Handler) GetInstanceVersion(ctx echo.Context) error {
	resp := adminapi.InstanceVersion{
		CurrentVersion:  CurrentVersion,
		UpdateAvailable: false,
		ChangelogUrl:    changelogURL,
	}

	// Try to fetch latest release from GitHub (non-blocking, with short timeout)
	if latest, releaseURL, err := fetchLatestGitHubRelease(); err == nil && latest != "" {
		resp.LatestVersion = &latest
		resp.ReleaseUrl = &releaseURL
		resp.UpdateAvailable = latest != CurrentVersion
	}

	return ctx.JSON(http.StatusOK, resp)
}

func fetchLatestGitHubRelease() (version string, url string, err error) {
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(releasesAPIURL)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("github API returned %d", resp.StatusCode)
	}

	var release struct {
		TagName string `json:"tag_name"`
		HTMLURL string `json:"html_url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return "", "", err
	}

	version = release.TagName
	if len(version) > 0 && version[0] == 'v' {
		version = version[1:]
	}
	return version, release.HTMLURL, nil
}
