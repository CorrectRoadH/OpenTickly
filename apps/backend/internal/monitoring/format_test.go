package monitoring

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"github.com/getsentry/sentry-go"
	"github.com/getsentry/sentry-go/attribute"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

type localTransport func(*http.Request) (*http.Response, error)

func (f localTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestRealSDKLogsMetricsHTTPPrivacyAndInt64(t *testing.T) {
	var mu sync.Mutex
	var bodies [][]byte
	receiver := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		mu.Lock()
		bodies = append(bodies, body)
		mu.Unlock()
		w.WriteHeader(200)
	}))
	defer receiver.Close()
	options := Options("https://public@example.invalid/1", "production", "api@test", nil)
	options.HTTPClient = &http.Client{Transport: localTransport(func(req *http.Request) (*http.Response, error) {
		clone := req.Clone(req.Context())
		clone.URL.Scheme = "http"
		clone.URL.Host = strings.TrimPrefix(receiver.URL, "http://")
		return http.DefaultTransport.RoundTrip(clone)
	})}
	client, err := sentry.NewClient(options)
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()
	ctx := BackgroundContext(context.Background(), client)
	sentry.GetHubFromContext(ctx).Scope().SetAttributes(attribute.String("scope.secret", "SENSITIVE"))
	logger := sentry.NewLogger(ctx)
	logger.SetAttributes(attribute.String("logger.secret", "SENSITIVE"))
	logger.Error().String("operation", "report.load").String("outcome", "error").String("call.secret", "SENSITIVE").Emit("operation.failed")
	logger.Error().Emit("SENSITIVE")
	meter := sentry.NewMeter(ctx)
	meter.SetAttributes(attribute.String("metric.secret", "SENSITIVE"))
	meter.Count("app.operation.count", 9007199254740993, sentry.WithAttributes(attribute.String("operation", "report.load"), attribute.String("call.secret", "SENSITIVE")))
	meter.Distribution("app.operation.duration", 1.5, sentry.WithUnit(sentry.UnitMillisecond))
	meter.Count("SENSITIVE", 1)
	if !client.Flush(2 * time.Second) {
		t.Fatal("flush failed")
	}
	mu.Lock()
	defer mu.Unlock()
	joined := bytes.Join(bodies, []byte("\n"))
	if bytes.Contains(joined, []byte("SENSITIVE")) || bytes.Contains(joined, []byte("sentry.server.address")) {
		t.Fatal("sensitive wire")
	}
	if !bytes.Contains(joined, []byte(`9007199254740993`)) {
		t.Fatal("lost int64 metric")
	}
	logs, metrics, reportedLogs, reportedMetrics := 0, 0, 0, 0
	for _, body := range bodies {
		lines := bytes.Split(body, []byte("\n"))
		for i := 1; i+1 < len(lines); i += 2 {
			var header struct {
				Type      string `json:"type"`
				Length    int    `json:"length"`
				ItemCount int    `json:"item_count"`
			}
			if json.Unmarshal(lines[i], &header) != nil {
				continue
			}
			if header.Type == "client_report" {
				var report struct {
					DiscardedEvents []struct {
						Reason   string `json:"reason"`
						Category string `json:"category"`
						Quantity int64  `json:"quantity"`
					} `json:"discarded_events"`
				}
				if err := json.Unmarshal(lines[i+1], &report); err != nil {
					t.Fatal(err)
				}
				for _, discarded := range report.DiscardedEvents {
					if discarded.Reason != "before_send" || discarded.Quantity <= 0 {
						t.Fatal("unexpected client report")
					}
					if discarded.Category == "log_item" {
						reportedLogs += int(discarded.Quantity)
					}
					if discarded.Category == "trace_metric" {
						reportedMetrics += int(discarded.Quantity)
					}
				}
			}
			if header.Type != "log" && header.Type != "trace_metric" {
				continue
			}
			if header.Length != len(lines[i+1]) {
				t.Fatalf("UTF8 byte length mismatch %d/%d", header.Length, len(lines[i+1]))
			}
			var payload struct {
				Items   []json.RawMessage `json:"items"`
				Version *int              `json:"version"`
				Ingest  any               `json:"ingest_settings"`
			}
			if err := json.Unmarshal(lines[i+1], &payload); err != nil {
				t.Fatal(err)
			}
			if payload.Version != nil || payload.Ingest != nil {
				t.Fatal("Go received JS container")
			}
			if len(payload.Items) != header.ItemCount {
				t.Fatal("wrong count")
			}
			if header.Type == "log" {
				logs += len(payload.Items)
			} else {
				metrics += len(payload.Items)
			}
		}
	}
	if reportedLogs != 1 || reportedMetrics != 1 {
		t.Fatalf("client report log=%d metric=%d", reportedLogs, reportedMetrics)
	}
	if logs != 1 || metrics != 2 {
		t.Fatalf("log=%d metric=%d", logs, metrics)
	}
}

func TestUnsampledOperationAndActualSchedulerCounts(t *testing.T) {
	var metrics []*sentry.Metric
	options := Options("https://public@example.invalid/1", "production", "api@test", &captureTransport{})
	options.TracesSampleRate = 0
	original := options.BeforeSendMetric
	options.BeforeSendMetric = func(metric *sentry.Metric) *sentry.Metric {
		clean := original(metric)
		if clean != nil {
			metrics = append(metrics, clean)
		}
		return clean
	}
	client, err := sentry.NewClient(options)
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()
	ctx := BackgroundContext(context.Background(), client)
	parent, finish := StartBusiness(ctx, "report.load")
	_, childFinish := StartBusiness(parent.Context(), "project.list")
	childFinish(nil)
	finish(nil)
	finish(nil)
	sentinel := errors.New("domain rejection")
	_, rejectedFinish := StartBusiness(ctx, "auth.login")
	rejection := sentinel
	FinishBusiness(rejectedFinish, &rejection, sentinel)
	if err := TraceScheduler(ctx, "audit_cleanup", func(context.Context) error { return nil }); err != nil {
		t.Fatal(err)
	}
	if err := TraceScheduler(ctx, "update_check", func(context.Context) error { return context.Canceled }); err != context.Canceled {
		t.Fatal("changed cancellation")
	}
	counts, ticks := 0, 0
	for _, metric := range metrics {
		switch metric.Name {
		case "app.operation.count":
			counts++
			if metric.Attributes["operation"].AsString() == "auth.login" && metric.Attributes["outcome"].AsString() != "rejected" {
				t.Fatal("domain rejection classified as service fault")
			}
		case "app.scheduler.tick":
			ticks++
		}
	}
	if counts != 2 || ticks != 2 {
		t.Fatalf("count=%d scheduler=%d", counts, ticks)
	}
}
