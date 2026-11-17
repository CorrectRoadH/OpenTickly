package application_test

import (
	"context"
	"github.com/getsentry/sentry-go"
	"io"
	"net/http"
	governance "opentoggl/backend/apps/backend/internal/governance/application"
	"opentoggl/backend/apps/backend/internal/log"
	"opentoggl/backend/apps/backend/internal/monitoring"
	"strings"
	"sync"
	"testing"
	"time"
)

type noWorkCleanupStore struct {
	governance.Store
	cancel context.CancelFunc
}

func (s noWorkCleanupStore) DeleteAuditLogsBefore(context.Context, time.Time, int) (int64, error) {
	s.cancel()
	return 0, nil
}

type localHTTP func(*http.Request) (*http.Response, error)

func (f localHTTP) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestActualAuditSchedulerCountsEmptyTick(t *testing.T) {
	observed := make(chan struct{})
	var once sync.Once
	options := monitoring.Options("https://public@example.invalid/1", "production", "api@test", nil)
	options.TracesSampleRate = 0
	original := options.BeforeSendMetric
	options.BeforeSendMetric = func(raw *sentry.Metric) *sentry.Metric {
		clean := original(raw)
		if clean != nil && clean.Name == "app.scheduler.tick" && clean.Attributes["scheduler"].AsString() == "audit_cleanup" {
			once.Do(func() { close(observed) })
		}
		return clean
	}
	options.HTTPClient = &http.Client{Transport: localHTTP(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader("{}"))}, nil
	})}
	client, err := sentry.NewClient(options)
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()
	ctx, cancel := context.WithCancel(monitoring.BackgroundContext(context.Background(), client))
	defer cancel()
	service, err := governance.NewService(noWorkCleanupStore{cancel: cancel}, log.NopLogger())
	if err != nil {
		t.Fatal(err)
	}
	governance.StartAuditLogCleanupWorker(ctx, service, 1)
	select {
	case <-observed:
	case <-time.After(5 * time.Second):
		t.Fatal("actual empty cleanup tick not counted")
	}
}
