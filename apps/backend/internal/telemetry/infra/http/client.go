package http

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"opentoggl/backend/apps/backend/internal/telemetry/domain"
)

// DefaultEndpoint is the production check endpoint. Override via
// OPENTOGGL_TELEMETRY_ENDPOINT for staging or offline deployments.
const DefaultEndpoint = "https://check.opentoggl.com/v1/check"

// DefaultTimeout is short — a slow check-in must never delay a request in
// the admin UI or hold the pinger goroutine.
const DefaultTimeout = 5 * time.Second

// userAgent is sent on every request so the worker can segment requests
// coming from backend pingers vs. ad-hoc callers.
const userAgent = "opentoggl-backend/telemetry"

// Client posts CheckinPayload to the upstream update worker and decodes the
// manifest reply.
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

func (c *Client) PostCheckin(ctx context.Context, payload domain.CheckinPayload) (domain.Manifest, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return domain.Manifest{}, fmt.Errorf("telemetry: marshal payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(body))
	if err != nil {
		return domain.Manifest{}, fmt.Errorf("telemetry: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return domain.Manifest{}, fmt.Errorf("telemetry: post checkin: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		snippet, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return domain.Manifest{}, fmt.Errorf("telemetry: upstream %d: %s", resp.StatusCode, bytes.TrimSpace(snippet))
	}

	var manifest domain.Manifest
	if err := json.NewDecoder(io.LimitReader(resp.Body, 64*1024)).Decode(&manifest); err != nil {
		return domain.Manifest{}, fmt.Errorf("telemetry: decode manifest: %w", err)
	}
	if manifest.LatestTag == "" {
		return domain.Manifest{}, errors.New("telemetry: upstream returned empty latestTag")
	}
	return manifest, nil
}
