package monitoring

import (
	"context"
	"github.com/getsentry/sentry-go"
	"github.com/labstack/echo/v5"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

func TestIncomingTraceRejectsZeroAndMalformed(t *testing.T) {
	for _, value := range []string{"00000000000000000000000000000000-bbbbbbbbbbbbbbbb-1", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-0000000000000000-1", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-2", "SENSITIVE"} {
		if incomingTrace(value) != "" {
			t.Fatal("accepted invalid trace")
		}
	}
	if incomingTrace("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-0") == "" {
		t.Fatal("rejected unsampled parent")
	}
}
func TestBusinessBackgroundUsesExplicitClientAndSafeDSC(t *testing.T) {
	transport := &captureTransport{}
	client, err := sentry.NewClient(Options("https://public@example.com/1", "production", "api@test", transport))
	if err != nil {
		t.Fatal(err)
	}
	ctx := BackgroundContext(context.Background(), client)
	span, finish := StartBusiness(ctx, UpdateCheck)
	if span == nil {
		t.Fatal("missing background span")
	}
	baggage := SafeBaggage(span)
	if baggage == "" {
		t.Fatal("missing DSC")
	}
	finish(context.Canceled)
	if span.Status != sentry.SpanStatusCanceled {
		t.Fatal("cancellation lost")
	}
	none, done := StartBusiness(context.Background(), UpdateCheck)
	done(nil)
	if none != nil {
		t.Fatal("unconfigured process created span")
	}
}

func TestConcurrentHTTPParentsAndBusinessOutcomes(t *testing.T) {
	transport := &captureTransport{}
	client, _ := sentry.NewClient(Options("https://public@example.com/1", "production", "api@test", transport))
	server := echo.New()
	server.Use(Middleware(client))
	server.GET("/work/:outcome", func(c *echo.Context) (resultErr error) {
		span, finish := StartBusiness(c.Request().Context(), "report.load")
		defer FinishBusiness(finish, &resultErr)
		if c.Param("outcome") == "cancel" {
			return context.Canceled
		}
		if span.Op != "task" {
			t.Error("server business phase must be task")
		}
		if span.ParentSpanID == (sentry.SpanID{}) {
			t.Error("missing business parent")
		}
		return c.NoContent(204)
	})
	receiver := httptest.NewServer(server)
	defer receiver.Close()
	var wait sync.WaitGroup
	for _, pair := range []struct{ trace, outcome string }{{"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "ok"}, {"cccccccccccccccccccccccccccccccc", "cancel"}} {
		wait.Add(1)
		go func(trace, outcome string) {
			defer wait.Done()
			req, _ := http.NewRequest("GET", receiver.URL+"/work/"+outcome, nil)
			req.Header.Set("sentry-trace", trace+"-bbbbbbbbbbbbbbbb-1")
			req.Header.Set("baggage", "sentry-transaction=SENSITIVE,other=SENSITIVE")
			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Error(err)
				return
			}
			resp.Body.Close()
		}(pair.trace, pair.outcome)
	}
	wait.Wait()
	client.Flush(time.Second)
	found := 0
	for _, event := range transport.events {
		if event.Type != "transaction" {
			continue
		}
		found++
		if len(event.Spans) != 1 || event.Spans[0].Description != "report.load" {
			t.Fatalf("business child missing")
		}
		child := event.Spans[0]
		if child.TraceID.String() != "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" && child.TraceID.String() != "cccccccccccccccccccccccccccccccc" {
			t.Fatal("scope crossed")
		}
		if child.TraceID.String() == "cccccccccccccccccccccccccccccccc" && child.Status != sentry.SpanStatusCanceled {
			t.Fatal("cancellation lost")
		}
	}
	if found != 2 {
		t.Fatalf("transactions %d", found)
	}
}
