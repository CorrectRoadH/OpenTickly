package httpapp

import (
	"context"
	"encoding/json"
	"io/fs"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"opentoggl/backend/apps/backend/internal/web"

	"github.com/labstack/echo/v4"
)

func TestServerServesEmbeddedIndexForRootAndClientRoutes(t *testing.T) {
	server := NewServer(web.NewHealthSnapshot("opentoggl", []string{"identity"}), nil)
	indexHTML := mustReadEmbeddedIndexHTML(t)

	for _, path := range []string{"/", "/projects", "/settings/profile"} {
		request := httptest.NewRequest(http.MethodGet, path, nil)
		request.Header.Set("Accept", "text/html")
		recorder := httptest.NewRecorder()

		server.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected %s to return 200, got %d", path, recorder.Code)
		}

		if contentType := recorder.Header().Get("Content-Type"); !strings.Contains(contentType, "text/html") {
			t.Fatalf("expected %s to return html, got %q", path, contentType)
		}

		if cacheControl := recorder.Header().Get("Cache-Control"); cacheControl != "no-cache" {
			t.Fatalf("expected %s index response to disable caching, got %q", path, cacheControl)
		}

		if recorder.Body.String() != indexHTML {
			t.Fatalf("expected %s to serve embedded index html", path)
		}
	}
}

func TestServerServesEmbeddedStaticFiles(t *testing.T) {
	server := NewServer(web.NewHealthSnapshot("opentoggl", []string{"identity"}), nil)
	indexHTML := mustReadEmbeddedIndexHTML(t)

	request := httptest.NewRequest(http.MethodGet, "/index.html", nil)
	request.Header.Set("Accept", "text/html")
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected /index.html to return 200, got %d", recorder.Code)
	}

	if contentType := recorder.Header().Get("Content-Type"); !strings.Contains(contentType, "text/html") {
		t.Fatalf("expected /index.html to return html, got %q", contentType)
	}

	if recorder.Body.String() != indexHTML {
		t.Fatal("expected /index.html to serve embedded static file")
	}
}

func TestServerDoesNotFallbackReservedRoutes(t *testing.T) {
	server := NewServer(web.NewHealthSnapshot("opentoggl", []string{"identity"}), nil)

	cases := []struct {
		path       string
		statusCode int
	}{
		{path: "/web/v1/session", statusCode: http.StatusNotFound},
		{path: "/web/v1/unknown", statusCode: http.StatusNotFound},
		{path: "/healthz", statusCode: http.StatusOK},
		{path: "/readyz", statusCode: http.StatusOK},
	}

	for _, testCase := range cases {
		request := httptest.NewRequest(http.MethodGet, testCase.path, nil)
		request.Header.Set("Accept", "text/html")
		recorder := httptest.NewRecorder()

		server.ServeHTTP(recorder, request)

		if recorder.Code != testCase.statusCode {
			t.Fatalf("expected %s to return %d, got %d", testCase.path, testCase.statusCode, recorder.Code)
		}
	}
}

func TestServerReturnsJSONForHealthRoutes(t *testing.T) {
	server := NewServer(web.NewHealthSnapshot("opentoggl", []string{"identity"}), nil)

	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected /healthz to return 200, got %d", recorder.Code)
	}

	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("expected /healthz response to be valid json: %v", err)
	}

	if _, ok := response["service"]; !ok {
		t.Fatalf("expected /healthz response to include service")
	}

	if _, ok := response["modules"]; !ok {
		t.Fatalf("expected /healthz response to include modules")
	}
}

func TestServerReturnsReadinessPayloadForReadyz(t *testing.T) {
	server := NewServer(web.NewHealthSnapshot("opentoggl", []string{"identity"}), nil)
	request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected /readyz to return 200, got %d", recorder.Code)
	}

	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("expected /readyz response to be valid json: %v", err)
	}

	if _, ok := response["service"]; !ok {
		t.Fatalf("expected /readyz response to include service")
	}

	if _, ok := response["checks"]; !ok {
		t.Fatalf("expected /readyz response to include checks")
	}

	if _, ok := response["modules"]; ok {
		t.Fatalf("expected /readyz response to not reuse health snapshot modules payload: %#v", response)
	}
}

func TestServerAssignsRequestIDAndLogsRequestFields(t *testing.T) {
	var logs strings.Builder
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	t.Cleanup(func() {
		slog.SetDefault(previousLogger)
	})

	server := NewServer(web.NewHealthSnapshot("opentoggl", []string{"identity"}), nil)
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	requestID := recorder.Header().Get(echo.HeaderXRequestID)
	if requestID == "" {
		t.Fatal("expected request log middleware to assign an X-Request-Id header")
	}

	var record map[string]any
	if err := json.Unmarshal([]byte(strings.TrimSpace(logs.String())), &record); err != nil {
		t.Fatalf("expected request log to emit json, got %q: %v", logs.String(), err)
	}

	if record["msg"] != "http request" {
		t.Fatalf("expected request log message, got %#v", record["msg"])
	}

	if record["method"] != http.MethodGet {
		t.Fatalf("expected request log method %q, got %#v", http.MethodGet, record["method"])
	}

	if record["path"] != "/healthz" {
		t.Fatalf("expected request log path /healthz, got %#v", record["path"])
	}

	if status, ok := record["status"].(float64); !ok || int(status) != http.StatusOK {
		t.Fatalf("expected request log status %d, got %#v", http.StatusOK, record["status"])
	}

	if record["request_id"] != requestID {
		t.Fatalf("expected request log request_id %q, got %#v", requestID, record["request_id"])
	}

	if _, ok := record["duration"]; !ok {
		t.Fatalf("expected request log to include duration, got %#v", record)
	}
}

func TestServerReturns503WhenReadinessProbeFails(t *testing.T) {
	var logs strings.Builder
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	server := NewServerWithOptions(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		nil,
		ServerOptions{
			Logger: logger,
			Readiness: stubReadinessProbe{
				report: web.ReadinessReport{
					Service: "opentoggl",
					Status:  web.StatusError,
					Checks: []web.ReadinessCheck{
						{
							Name:    "postgres",
							Status:  web.StatusError,
							Target:  "127.0.0.1:5432",
							Message: "dial tcp 127.0.0.1:5432: connect: connection refused",
						},
					},
				},
			},
		},
	)
	request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected /readyz to return 503, got %d", recorder.Code)
	}

	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("expected /readyz response to be valid json: %v", err)
	}

	if response["status"] != web.StatusError {
		t.Fatalf("expected /readyz status error, got %#v", response["status"])
	}

	var readinessRecord map[string]any
	for _, line := range strings.Split(strings.TrimSpace(logs.String()), "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}

		var record map[string]any
		if err := json.Unmarshal([]byte(line), &record); err != nil {
			t.Fatalf("expected readiness failure logs to be valid json, got %q: %v", line, err)
		}

		if record["msg"] == "readiness check failed" {
			readinessRecord = record
			break
		}
	}

	if readinessRecord == nil {
		t.Fatalf("expected readiness failure diagnostics in logs, got %q", logs.String())
	}

	if readinessRecord["service"] != "opentoggl" {
		t.Fatalf("expected readiness failure log service %q, got %#v", "opentoggl", readinessRecord["service"])
	}

	if readinessRecord["check"] != "postgres" {
		t.Fatalf("expected readiness failure log check %q, got %#v", "postgres", readinessRecord["check"])
	}

	if readinessRecord["target"] != "127.0.0.1:5432" {
		t.Fatalf("expected readiness failure log target %q, got %#v", "127.0.0.1:5432", readinessRecord["target"])
	}

	if readinessRecord["message"] != "dial tcp 127.0.0.1:5432: connect: connection refused" {
		t.Fatalf(
			"expected readiness failure log message %q, got %#v",
			"dial tcp 127.0.0.1:5432: connect: connection refused",
			readinessRecord["message"],
		)
	}
}

func TestServerDoesNotFallbackMissingStaticAssets(t *testing.T) {
	server := NewServer(web.NewHealthSnapshot("opentoggl", []string{"identity"}), nil)

	request := httptest.NewRequest(http.MethodGet, "/assets/app.js", nil)
	request.Header.Set("Accept", "*/*")
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected missing asset request to return 404, got %d", recorder.Code)
	}
}

func TestComposeRouteRegistrarsRegistersEachNonNilRegistrarInOrder(t *testing.T) {
	var calls []string
	server := NewServer(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		ComposeRouteRegistrars(
			func(*echo.Echo) { calls = append(calls, "first") },
			nil,
			func(*echo.Echo) { calls = append(calls, "second") },
		),
	)

	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected /healthz to return 200, got %d", recorder.Code)
	}

	if len(calls) != 2 {
		t.Fatalf("expected 2 registrar calls, got %d", len(calls))
	}

	if calls[0] != "first" || calls[1] != "second" {
		t.Fatalf("expected registrar order [first second], got %#v", calls)
	}
}

func mustReadEmbeddedIndexHTML(t *testing.T) string {
	t.Helper()

	indexHTML, err := fs.ReadFile(web.StaticFiles(), "index.html")
	if err != nil {
		t.Fatalf("expected embedded index.html to exist: %v", err)
	}

	return string(indexHTML)
}

type stubReadinessProbe struct {
	report web.ReadinessReport
}

func (probe stubReadinessProbe) Check(context.Context) web.ReadinessReport {
	return probe.report
}
