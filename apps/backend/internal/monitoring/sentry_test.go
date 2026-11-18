package monitoring

import (
	"context"
	"encoding/json"
	"errors"
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
			unhandled := false
			for i := range event.Exception {
				event.Exception[i].Mechanism = &sentry.Mechanism{Type: "panic", Handled: &unhandled, IsExceptionGroup: true, Description: "SENSITIVE"}
			}
			return event
		})
		return errors.New("SENSITIVE")
	})
	req := httptest.NewRequest("GET", "https://track.opentoggl.com/items/SENSITIVE?q=SENSITIVE", nil)
	req.Header.Set("Authorization", "SENSITIVE")
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
		for _, exception := range event.Exception {
			if exception.Mechanism == nil || exception.Mechanism.Handled == nil || *exception.Mechanism.Handled || !exception.Mechanism.IsExceptionGroup {
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
