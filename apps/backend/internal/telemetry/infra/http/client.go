package http

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"opentoggl/backend/apps/backend/internal/telemetry/domain"
)

// DefaultEndpoint is the production update-manifest endpoint. Forkers who
// want a private update server change this const and rebuild — there is no
// env-var knob.
const DefaultEndpoint = "https://update.opentoggl.com/"

// DefaultTimeout is short — a slow manifest fetch must never delay a request
// in the admin UI or hold the pinger goroutine.
const DefaultTimeout = 5 * time.Second

// userAgent is sent on every request so the worker can segment requests
// coming from backend pingers vs. ad-hoc callers.
const userAgent = "opentoggl-backend/telemetry"

// maxResponseBytes caps how much we'll read from upstream. Plenty of room for
// release notes markdown + active announcements.
const maxResponseBytes = 256 * 1024

// Client fetches the update manifest from the upstream worker. The telemetry
// side-effect (DAU indexing) happens server-side — the client just sends
// build-info query params on the GET and decodes the manifest reply.
type Client struct {
	endpoint string
	http     *http.Client
}

type Config struct {
	Endpoint string
	Timeout  time.Duration
	HTTP     *http.Client
}

func NewClient(cfg Config) (*Client, error) {
	endpoint := cfg.Endpoint
	if endpoint == "" {
		endpoint = DefaultEndpoint
	}
	if _, err := url.Parse(endpoint); err != nil {
		return nil, fmt.Errorf("telemetry: invalid endpoint %q: %w", endpoint, err)
	}
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = DefaultTimeout
	}
	httpClient := cfg.HTTP
	if httpClient == nil {
		httpClient = &http.Client{Timeout: timeout}
	}
	return &Client{endpoint: endpoint, http: httpClient}, nil
}

// FetchManifest sends a GET to the update worker with the build-info query
// params and decodes the manifest reply. The upstream is idempotent — retries
// are safe.
func (c *Client) FetchManifest(ctx context.Context, payload domain.CheckinPayload) (domain.Manifest, error) {
	u, err := url.Parse(c.endpoint)
	if err != nil {
		return domain.Manifest{}, fmt.Errorf("telemetry: parse endpoint: %w", err)
	}
	q := u.Query()
	if payload.Version != "" {
		q.Set("version", payload.Version)
	}
	if id := payload.InstanceID.String(); id != "" && id != zeroUUID {
		q.Set("instanceId", id)
	}
	if payload.GoVersion != "" {
		q.Set("goVersion", payload.GoVersion)
	}
	if payload.OS != "" {
		q.Set("os", payload.OS)
	}
	if payload.Arch != "" {
		q.Set("arch", payload.Arch)
	}
	if payload.Locale != "" {
		q.Set("locale", payload.Locale)
	}
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return domain.Manifest{}, fmt.Errorf("telemetry: build request: %w", err)
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return domain.Manifest{}, fmt.Errorf("telemetry: fetch manifest: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		snippet, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return domain.Manifest{}, fmt.Errorf("telemetry: upstream %d: %s", resp.StatusCode, bytes.TrimSpace(snippet))
	}

	var manifest domain.Manifest
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxResponseBytes)).Decode(&manifest); err != nil {
		return domain.Manifest{}, fmt.Errorf("telemetry: decode manifest: %w", err)
	}
	if manifest.LatestTag == "" {
		return domain.Manifest{}, errors.New("telemetry: upstream returned empty latestTag")
	}
	return manifest, nil
}

const zeroUUID = "00000000-0000-0000-0000-000000000000"
