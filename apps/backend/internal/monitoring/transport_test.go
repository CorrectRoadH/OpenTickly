package monitoring

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/labstack/echo/v5"
)

func TestFinalHTTPEnvelope(t *testing.T) {
	var mu sync.Mutex
	var envelopes []string
	ingestion := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Error(err)
		}
		mu.Lock()
		envelopes = append(envelopes, string(body))
		mu.Unlock()
		w.WriteHeader(http.StatusOK)
	}))
	defer ingestion.Close()
	options := Options(strings.Replace(ingestion.URL, "http://", "http://public@", 1)+"/1", "production", "api@test", nil)
	options.TracesSampleRate = 1
	client, err := sentry.NewClient(options)
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()
	e := echo.New()
	e.Use(Middleware(client))
	failure := fmt.Errorf("Could not open report.tsv: %w", &reportLoadError{})
	e.GET("/:id", func(c *echo.Context) error {
		span := sentry.StartSpan(c.Request().Context(), "db.query", sentry.WithDescription("Bearer SENSITIVE"))
		span.SetData("nested", struct{ Token string }{"SENSITIVE"})
		defer span.Finish()
		sentry.GetHubFromContext(c.Request().Context()).CaptureMessage("Workspace 42: Bearer SENSITIVE")
		panicReport(failure)
		return nil
	})
	req := httptest.NewRequest(http.MethodGet, "https://track.opentoggl.com/report.tsv?token=SENSITIVE", nil)
	req.Header.Set("baggage", "sentry-transaction=SENSITIVE,sentry-environment=SENSITIVE")
	req.Header.Set("sentry-trace", "01234567890123456789012345678901-0123456789012345-1")
	req.Header.Set("Cookie", "session=SENSITIVE")
	func() {
		defer func() {
			if recovered := recover(); recovered != failure {
				t.Fatalf("recovered %v, want the original error", recovered)
			}
		}()
		e.ServeHTTP(httptest.NewRecorder(), req)
	}()
	if !client.Flush(time.Second * 2) {
		t.Fatal("flush timed out")
	}
	mu.Lock()
	defer mu.Unlock()
	var messages, exceptions, transactions int
	for _, body := range envelopes {
		if strings.Contains(body, "SENSITIVE") {
			t.Fatalf("leaked final envelope: %s", body)
		}
		lines := strings.SplitN(body, "\n", 3)
		var header struct{ Type string }
		if len(lines) != 3 || json.Unmarshal([]byte(lines[1]), &header) != nil {
			t.Fatalf("invalid envelope: %s", body)
		}
		switch header.Type {
		case "transaction":
			transactions++
		case "event":
			var event sentry.Event
			if err := json.Unmarshal([]byte(lines[2]), &event); err != nil {
				t.Fatal(err)
			}
			if event.Message == "Workspace 42: Bearer [Filtered]" {
				messages++
				continue
			}
			exceptions++
			if event.Tags["route"] != "/:id" || len(event.Exception) != 2 {
				t.Fatalf("missing request route or error chain: %+v", event.Exception)
			}
			cause, outer := event.Exception[0], event.Exception[1]
			const causeValue = "Bearer [Filtered] at https://[Filtered]@example.com/items/42"
			if cause.Type != "*monitoring.reportLoadError" || cause.Value != causeValue ||
				outer.Type != "*fmt.wrapError" || outer.Value != "Could not open report.tsv: "+causeValue {
				t.Fatalf("lost original exception or cause: %+v", event.Exception)
			}
			if outer.Stacktrace == nil || !slices.ContainsFunc(outer.Stacktrace.Frames, func(frame sentry.Frame) bool {
				return filepath.Base(frame.AbsPath) == "transport_test.go" && frame.Function == "panicReport" && frame.Lineno > 0
			}) {
				t.Fatalf("missing panicReport origin frame: %+v", outer.Stacktrace)
			}
		}
	}
	if messages != 1 || exceptions != 1 || transactions != 1 {
		t.Fatalf("want one message, one exception and one transaction; got %d, %d and %d", messages, exceptions, transactions)
	}
}

func panicReport(failure error) {
	panic(failure)
}
