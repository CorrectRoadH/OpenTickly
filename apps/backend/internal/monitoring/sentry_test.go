package monitoring

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/labstack/echo/v5"
)

type captureTransport struct {
	events []*sentry.Event
	mu     sync.Mutex
}

func (t *captureTransport) Configure(sentry.ClientOptions) {}
func (t *captureTransport) SendEvent(e *sentry.Event) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.events = append(t.events, e)
}
func (t *captureTransport) Flush(time.Duration) bool                { return true }
func (t *captureTransport) FlushWithContext(_ context.Context) bool { return true }
func (t *captureTransport) Close()                                  {}
func TestRequestCapturePrivacy(t *testing.T) {
	transport := &captureTransport{}
	client, err := sentry.NewClient(Options("https://public@example.com/1", "production", "api@test", transport))
	if err != nil {
		t.Fatal(err)
	}
	e := echo.New()
	e.Use(Middleware(client))
	e.GET("/items/:id", func(c *echo.Context) error {
		hub := sentry.GetHubFromContext(c.Request().Context())
		hub.Scope().SetContext("nested", sentry.Context{"secret": "SENSITIVE"})
		hub.Scope().SetUser(sentry.User{Email: "SENSITIVE"})
		hub.Scope().AddEventProcessor(func(event *sentry.Event, _ *sentry.EventHint) *sentry.Event {
			request := c.Request()
			event.Request = &sentry.Request{
				URL: request.URL.EscapedPath(), Method: request.Method, QueryString: request.URL.RawQuery,
				Headers: map[string]string{"Authorization": request.Header.Get("Authorization"), "Accept": request.Header.Get("Accept")},
			}
			unhandled := false
			for i := range event.Exception {
				event.Exception[i].Mechanism = &sentry.Mechanism{Type: "panic", Handled: &unhandled, IsExceptionGroup: true, Description: "panic mechanism detail"}
			}
			return event
		})
		return fmt.Errorf("load report.tsv: %w", &reportLoadError{})
	})
	req := httptest.NewRequest("GET", "https://track.opentoggl.com/items/report.tsv?q=quarterly&%73ig=SENSITIVE", nil)
	req.Header.Set("Authorization", "SENSITIVE")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("sentry-trace", "01234567890123456789012345678901-0123456789012345-1")
	recorder := httptest.NewRecorder()
	e.ServeHTTP(recorder, req)
	client.Flush(time.Second)
	if recorder.Code != 500 {
		t.Fatal(recorder.Code)
	}
	if len(transport.events) < 2 {
		t.Fatalf("wanted error and transaction, got %d", len(transport.events))
	}
	for _, event := range transport.events {
		payload, _ := json.Marshal(event)
		if strings.Contains(string(payload), "SENSITIVE") {
			t.Fatalf("leaked payload: %s", payload)
		}
		if event.Type != "transaction" {
			if event.Tags["route"] != "/items/:id" || event.Tags["http.method"] != "GET" || event.Tags["http.status_code"] != "500" || event.Transaction != "http.server" {
				t.Fatalf("wrong request metadata: %v, transaction=%q", event.Tags, event.Transaction)
			}
			if request := event.Request; request == nil || !strings.HasSuffix(request.URL, "/items/report.tsv") ||
				request.QueryString != "q=quarterly&%73ig=[Filtered]" || request.Headers["Authorization"] != "[Filtered]" || request.Headers["Accept"] != "application/json" {
				t.Fatalf("wrong request: %+v", request)
			}
			if len(event.Exception) != 2 {
				t.Fatalf("expected wrapped error chain: %+v", event.Exception)
			}
			root, outer := event.Exception[0], event.Exception[1]
			if root.Type != "*monitoring.reportLoadError" || outer.Value != "load report.tsv: Bearer [Filtered] at https://[Filtered]@example.com/items/42" {
				t.Fatalf("lost error details: %+v", event.Exception)
			}
			if outer.Stacktrace == nil || len(outer.Stacktrace.Frames) == 0 {
				t.Fatal("lost stack trace")
			}
			if root.Mechanism == nil || root.Mechanism.Handled == nil || *root.Mechanism.Handled || !root.Mechanism.IsExceptionGroup || root.Mechanism.Description != "panic mechanism detail" {
				t.Fatal("lost unhandled exception semantics")
			}
		}
		if event.Tags["component"] != "api" {
			t.Fatal(event.Tags)
		}
	}
}
func TestDisabledConfig(t *testing.T) {
	for _, dsn := range []string{"", "bad", "http://public@example.com/1"} {
		if New(dsn, "production", "api@test") != nil {
			t.Fatal(dsn)
		}
	}
}

func TestInboundUnsampledTraceStillCapturesErrors(t *testing.T) {
	transport := &captureTransport{}
	client, err := sentry.NewClient(Options("https://public@example.com/1", "production", "api@test", transport))
	if err != nil {
		t.Fatal(err)
	}
	e := echo.New()
	e.Use(Middleware(client))
	e.GET("/", func(c *echo.Context) error { return errors.New("SENSITIVE") })
	req := httptest.NewRequest("GET", "https://selfhosted.example/", nil)
	req.Header.Set("sentry-trace", "01234567890123456789012345678901-0123456789012345-0")
	e.ServeHTTP(httptest.NewRecorder(), req)
	client.Flush(time.Second)
	if len(transport.events) != 1 || transport.events[0].Type == "transaction" {
		t.Fatalf("wanted only unsampled request error, got %d", len(transport.events))
	}
}

type reportLoadError struct{}

func (*reportLoadError) Error() string {
	return "Bearer SENSITIVE at https://user:SENSITIVE@example.com/items/42"
}

func TestRequestErrorReporting(t *testing.T) {
	for _, tt := range []struct {
		name          string
		handler       echo.HandlerFunc
		clientAborted bool
		panicValue    any
		status        string
		message       string
	}{
		{name: "4xx", handler: func(*echo.Context) error { return echo.ErrBadRequest }},
		{name: "cancelled", handler: func(*echo.Context) error {
			return fmt.Errorf("waiting for report: %w", context.Canceled)
		}},
		{name: "client disconnected", clientAborted: true, handler: func(*echo.Context) error {
			return errors.New("write failed")
		}},
		{name: "explicit 5xx", handler: func(c *echo.Context) error {
			return c.NoContent(http.StatusServiceUnavailable)
		}, status: "503", message: "HTTP 503 Service Unavailable"},
		{name: "panic with non-error value", handler: func(*echo.Context) error {
			panic("report processing panicked")
		}, panicValue: "report processing panicked", status: "500", message: "report processing panicked"},
		{name: "server abort signal", handler: func(*echo.Context) error {
			panic(http.ErrAbortHandler)
		}, panicValue: http.ErrAbortHandler},
	} {
		t.Run(tt.name, func(t *testing.T) {
			transport := &captureTransport{}
			options := Options("https://public@example.com/1", "test", "api@test", transport)
			options.TracesSampleRate = 0
			client, err := sentry.NewClient(options)
			if err != nil {
				t.Fatal(err)
			}
			defer client.Close()
			server := echo.New()
			server.Use(Middleware(client))
			server.POST("/reports/:id", tt.handler)
			req := httptest.NewRequest(http.MethodPost, "/reports/42", nil)
			if tt.clientAborted {
				ctx, cancel := context.WithCancel(req.Context())
				cancel()
				req = req.WithContext(ctx)
			}
			func() {
				defer func() {
					if got := recover(); got != tt.panicValue {
						t.Fatalf("recovered %v, want %v", got, tt.panicValue)
					}
				}()
				server.ServeHTTP(httptest.NewRecorder(), req)
			}()
			if tt.status == "" {
				if len(transport.events) != 0 {
					t.Fatal("unexpected error event")
				}
				return
			}
			if len(transport.events) != 1 || len(transport.events[0].Exception) != 1 {
				t.Fatal("expected one Sentry exception")
			}
			event := transport.events[0]
			exception := event.Exception[0]
			if event.Tags["route"] != "/reports/:id" || event.Tags["http.method"] != http.MethodPost ||
				event.Tags["http.status_code"] != tt.status || exception.Value != tt.message ||
				exception.Stacktrace == nil || len(exception.Stacktrace.Frames) == 0 {
				t.Fatalf("unexpected request error: %v, +%v", event.Tags, exception)
			}
			if tt.panicValue != nil && (exception.Type != "string" || exception.Mechanism == nil ||
				exception.Mechanism.Handled == nil || *exception.Mechanism.Handled) {
				t.Fatalf("lost panic details: %+v", exception)
			}
		})
	}
}
