package monitoring_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/jackc/pgx/v5"
	"opentoggl/backend/apps/backend/internal/monitoring"
	"opentoggl/backend/apps/backend/internal/platform"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestQueryTracerRealPostgresLifecycle(t *testing.T) {
	db := pgtest.OpenEphemeral(t)
	handle, err := platform.NewDatabaseHandle(db.ConnString())
	if err != nil {
		t.Fatal(err)
	}
	defer handle.Close()
	var mu sync.Mutex
	type wireSpan struct {
		TraceID      string    `json:"trace_id"`
		SpanID       string    `json:"span_id"`
		ParentSpanID string    `json:"parent_span_id"`
		Op           string    `json:"op"`
		Description  string    `json:"description"`
		Status       string    `json:"status"`
		StartTime    time.Time `json:"start_timestamp"`
		EndTime      time.Time `json:"timestamp"`
	}
	type wireEvent struct {
		Type    string     `json:"type"`
		EventID string     `json:"event_id"`
		Spans   []wireSpan `json:"spans"`
	}
	var events []wireEvent
	receiver := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		if bytes.Contains(body, []byte("SENSITIVE")) {
			t.Error("query metadata escaped")
		}
		for _, line := range bytes.Split(body, []byte("\n")) {
			var event wireEvent
			err := json.Unmarshal(line, &event)
			if bytes.Contains(line, []byte(`"spans"`)) && err != nil {
				t.Errorf("decode real transaction: %v", err)
			}
			if err == nil && event.Type == "transaction" && event.EventID != "" {
				mu.Lock()
				events = append(events, event)
				mu.Unlock()
			}
		}
		w.WriteHeader(200)
	}))
	defer receiver.Close()
	options := monitoring.Options("http://public@"+strings.TrimPrefix(receiver.URL, "http://")+"/1", "production", "api@driver-test", nil)
	options.TracesSampleRate = 1
	client, err := sentry.NewClient(options)
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()
	ctx := monitoring.BackgroundContext(context.Background(), client)
	root := sentry.StartTransaction(ctx, "report.load", sentry.WithOpName("http.server"))
	phase, finish := monitoring.StartBusiness(root.Context(), "report.load")
	rows, err := handle.Pool().Query(phase.Context(), "select $1::text as SENSITIVE", "SENSITIVE")
	if err != nil {
		t.Fatal(err)
	}
	// Query returns before Rows closes. The span must include the entire hold.
	closedAt := time.Now()
	rows.Close()
	if rows.Err() != nil {
		t.Fatal(rows.Err())
	}
	_, queryErr := handle.Pool().Exec(phase.Context(), "select 1/0 /* SENSITIVE */")
	if queryErr == nil {
		t.Fatal("expected real PostgreSQL error")
	}
	cancelled, cancel := context.WithCancel(phase.Context())
	cancel()
	if _, err := handle.Pool().Exec(cancelled, "select 1"); !errors.Is(err, context.Canceled) {
		t.Fatal("cancellation changed")
	}
	// Cancel after acquisition so the driver starts and finishes an actual query.
	conn, err := handle.Pool().Acquire(phase.Context())
	if err != nil {
		t.Fatal(err)
	}
	_, err = conn.Exec(cancelled, "select 1 /* SENSITIVE */")
	conn.Release()
	if !errors.Is(err, context.Canceled) {
		t.Fatal("driver cancellation changed")
	}
	batch := &pgx.Batch{}
	batch.Queue("select 1")
	batch.Queue("select 2")
	results := handle.Pool().SendBatch(phase.Context(), batch)
	if err := results.Close(); err != nil {
		t.Fatal(err)
	}
	finish(nil)
	root.Finish()
	if !client.Flush(2 * time.Second) {
		t.Fatal("flush failed")
	}
	mu.Lock()
	defer mu.Unlock()
	if len(events) != 1 {
		t.Fatalf("transactions %d", len(events))
	}
	queries := events[0].Spans
	successful, failed, cancelledCount, batches := 0, 0, 0, 0
	for _, span := range queries {
		if span.Op != "db.query" {
			continue
		}
		if span.ParentSpanID != phase.SpanID.String() || span.TraceID != root.TraceID.String() {
			t.Fatal("driver parent lost")
		}
		if !span.EndTime.After(span.StartTime) {
			t.Fatal("unfinished query")
		}
		if span.Description == "db.batch" {
			batches++
		}
		switch span.Status {
		case "ok":
			successful++
			if span.Description == "db.query" && span.EndTime.Before(closedAt) {
				t.Fatal("query ended before Rows close")
			}
		case "internal_error":
			failed++
		case "cancelled":
			cancelledCount++
		}
	}
	if successful < 2 || failed != 1 || cancelledCount != 1 || batches != 1 {
		t.Fatalf("query outcomes success=%d error=%d cancelled=%d batch=%d", successful, failed, cancelledCount, batches)
	}
}
