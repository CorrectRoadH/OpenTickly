package bootstrap

import (
	"context"
	"fmt"
	"net/http"

	"opentoggl/backend/apps/backend/internal/platform/safehttp"
	webhooksapplication "opentoggl/backend/apps/backend/internal/webhooks/application"
)

// safeHTTPProber adapts the SSRF-hardened HTTP client in platform.WebhookHandle
// to the webhooksapplication.Prober interface. Keeping the adapter here (in
// bootstrap) means the webhooks application package stays free of HTTP
// transport concerns, and the network-layer guard stays concentrated in the
// composition root.
type safeHTTPProber struct {
	client *http.Client
}

func newSafeHTTPProber(client *http.Client) webhooksapplication.Prober {
	return &safeHTTPProber{client: client}
}

func (p *safeHTTPProber) Probe(ctx context.Context, rawURL string) error {
	if err := safehttp.ValidateURL(rawURL); err != nil {
		return fmt.Errorf("URL endpoint %s request failed with error: %v", rawURL, err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return fmt.Errorf("URL endpoint %s request failed with error: %v", rawURL, err)
	}
	req.Header.Set("User-Agent", "OpenToggl-Webhook-Probe/1.0")
	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("URL endpoint %s request failed with error: %v", rawURL, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("URL endpoint %s responded with status %d instead of 200", rawURL, resp.StatusCode)
	}
	return nil
}
