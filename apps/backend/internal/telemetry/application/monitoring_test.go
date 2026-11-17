package application_test

import (
	"context"
	"github.com/getsentry/sentry-go"
	"io"
	"net/http"
	"opentoggl/backend/apps/backend/internal/monitoring"
	"opentoggl/backend/apps/backend/internal/telemetry/application"
	"opentoggl/backend/apps/backend/internal/telemetry/domain"
	"strings"
	"sync"
	"testing"
	"time"
)

type cancelClient struct{ cancel context.CancelFunc }

func (c cancelClient) FetchManifest(context.Context, domain.CheckinPayload) (domain.Manifest, error) {
	c.cancel()
	return domain.Manifest{LatestTag: "v1"}, nil
}

type discardHTTP func(*http.Request) (*http.Response, error)

func (f discardHTTP) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestRealPingerLoopRecordsOneActualTick(t *testing.T) {
	var mu sync.Mutex
	var received []*sentry.Metric
	options := monitoring.Options("https://public@example.invalid/1", "production", "api@test", nil)
	options.TracesSampleRate = 0
	hook := options.BeforeSendMetric
	options.BeforeSendMetric = func(metric *sentry.Metric) *sentry.Metric {
		clean := hook(metric)
		if clean != nil {
			mu.Lock()
			received = append(received, clean)
			mu.Unlock()
		}
		return clean
	}
	options.HTTPClient = &http.Client{Transport: discardHTTP(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader("{}"))}, nil
	})}
	client, err := sentry.NewClient(options)
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()
	ctx, cancel := context.WithCancel(monitoring.BackgroundContext(context.Background(), client))
	defer cancel()
	pinger, err := application.NewPinger(application.Config{Store: &fakeStore{id: newID(t)}, Client: cancelClient{cancel}, BuildInfo: staticBuildInfo{}, Interval: time.Hour, MaxJitter: -1})
	if err != nil {
		t.Fatal(err)
	}
	pinger.Run(ctx)
	ticks, operations := 0, 0
	for _, metric := range received {
		if metric.Name == "app.scheduler.tick" {
			ticks++
			if metric.Attributes["scheduler"].AsString() != "update_check" {
				t.Fatal("incorrect scheduler")
			}
		}
		if metric.Name == "app.operation.count" {
			operations++
		}
	}
	if ticks != 1 || operations != 1 {
		t.Fatalf("ticks=%d operation=%d", ticks, operations)
	}
}
