package http

import (
	"context"
	"github.com/getsentry/sentry-go"
	"net/http"
	"net/http/httptest"
	"opentoggl/backend/apps/backend/internal/monitoring"
	"opentoggl/backend/apps/backend/internal/telemetry/domain"
	"strings"
	"testing"
)

type targetTransport struct {
	target  string
	headers []http.Header
	spans   []*sentry.Span
}

func (t *targetTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	t.headers = append(t.headers, req.Header.Clone())
	t.spans = append(t.spans, sentry.SpanFromContext(req.Context()))
	clone := req.Clone(req.Context())
	clone.URL.Scheme = "http"
	clone.URL.Host = strings.TrimPrefix(t.target, "http://")
	return http.DefaultTransport.RoundTrip(clone)
}
func TestDedicatedClientPropagationAndRedirect(t *testing.T) {
	receiverHeaders := []http.Header{}
	receiver := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receiverHeaders = append(receiverHeaders, r.Header.Clone())
		w.Write([]byte(`{"latestTag":"v1"}`))
	}))
	defer receiver.Close()
	redirect := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, receiver.URL, 307) }))
	defer redirect.Close()
	sdk, err := sentry.NewClient(monitoring.Options("https://public@example.com/1", "production", "api@test", nil))
	if err != nil {
		t.Fatal(err)
	}
	span, finish := monitoring.StartBusiness(monitoring.BackgroundContext(context.Background(), sdk), monitoring.UpdateCheck)
	defer finish(nil)
	for _, test := range []struct {
		endpoint string
		sends    bool
	}{{DefaultEndpoint, true}, {"https://update.opentoggl.com.evil/", false}, {"https://user@update.opentoggl.com/", false}, {"https://update.opentoggl.com/other", false}, {"http://update.opentoggl.com/", false}} {
		t.Run(test.endpoint, func(t *testing.T) {
			transport := &targetTransport{target: receiver.URL}
			client, _ := NewClient(Config{Endpoint: test.endpoint, HTTP: &http.Client{Transport: transport}})
			_, err := client.FetchManifest(span.Context(), domain.CheckinPayload{})
			if err != nil {
				t.Fatal(err)
			}
			if got := transport.headers[0].Get("sentry-trace") != ""; got != test.sends {
				t.Fatalf("propagation=%v", got)
			}
			child := transport.spans[0]
			if child == nil || child.Op != "http.client" || child.ParentSpanID != span.SpanID || !child.EndTime.After(child.StartTime) {
				t.Fatal("dedicated HTTP dependency span missing or unfinished")
			}
			if test.sends && transport.headers[0].Get("sentry-trace") != child.ToSentryTrace() {
				t.Fatal("propagation did not originate at HTTP child")
			}
			if strings.Contains(transport.headers[0].Get("baggage"), "transaction") {
				t.Fatal("unsafe DSC")
			}
		})
	}
	transport := &targetTransport{target: redirect.URL}
	// Only rewrite the first trusted target; redirected requests use real receiver.
	client, _ := NewClient(Config{HTTP: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		if req.URL.Host == "update.opentoggl.com" {
			return transport.RoundTrip(req)
		}
		return http.DefaultTransport.RoundTrip(req)
	})}})
	_, err = client.FetchManifest(span.Context(), domain.CheckinPayload{})
	if err != nil {
		t.Fatal(err)
	}
	if receiverHeaders[len(receiverHeaders)-1].Get("sentry-trace") != "" || receiverHeaders[len(receiverHeaders)-1].Get("baggage") != "" {
		t.Fatal("redirect leaked telemetry")
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
