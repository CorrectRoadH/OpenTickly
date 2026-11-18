package monitoring

import (
	"io"
	"net/http"
	"net/http/httptest"
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
	e := echo.New()
	e.Use(Middleware(client))
	e.GET("/:id", func(c *echo.Context) error {
		span := sentry.StartSpan(c.Request().Context(), "db.query", sentry.WithDescription("SENSITIVE"))
		span.SetData("nested", struct{ Token string }{"SENSITIVE"})
		defer span.Finish()
		sentry.GetHubFromContext(c.Request().Context()).CaptureMessage("SENSITIVE")
		return echo.NewHTTPError(500, "SENSITIVE")
	})
	req := httptest.NewRequest(http.MethodGet, "https://track.opentoggl.com/SENSITIVE?q=SENSITIVE", nil)
	req.Header.Set("baggage", "sentry-transaction=SENSITIVE,sentry-environment=SENSITIVE")
	req.Header.Set("sentry-trace", "01234567890123456789012345678901-0123456789012345-1")
	req.Header.Set("Cookie", "session=SENSITIVE")
	e.ServeHTTP(httptest.NewRecorder(), req)
	if !client.Flush(time.Second * 2) {
		t.Fatal("flush timed out")
	}
	mu.Lock()
	defer mu.Unlock()
	if len(envelopes) < 2 {
		t.Fatalf("expected error and trace, got %d", len(envelopes))
	}
	for _, body := range envelopes {
		if strings.Contains(body, "SENSITIVE") {
			t.Fatalf("leaked final envelope: %s", body)
		}
	}
}
