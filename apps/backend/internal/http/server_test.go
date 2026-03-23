package httpapp

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/web"

	"github.com/labstack/echo/v4"
)

func TestServerDoesNotServeFrontendFallbackWithoutCompiledWebsiteAssets(t *testing.T) {
	server := NewServer(web.NewHealthSnapshot("opentoggl", []string{"identity"}), nil)

	for _, path := range []string{"/", "/projects", "/settings/profile"} {
		request := httptest.NewRequest(http.MethodGet, path, nil)
		request.Header.Set("Accept", "text/html")
		recorder := httptest.NewRecorder()

		server.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusNotFound {
			t.Fatalf("expected %s to return 404 without compiled website assets, got %d", path, recorder.Code)
		}
	}
}

func TestServerDoesNotServeEmbeddedStaticFilesWithoutCompiledWebsiteAssets(t *testing.T) {
	server := NewServer(web.NewHealthSnapshot("opentoggl", []string{"identity"}), nil)

	request := httptest.NewRequest(http.MethodGet, "/index.html", nil)
	request.Header.Set("Accept", "text/html")
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected /index.html to return 404 without compiled website assets, got %d", recorder.Code)
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

func TestServerLogsTraceCorrelationFieldsWhenPresent(t *testing.T) {
	var logs strings.Builder
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	t.Cleanup(func() {
		slog.SetDefault(previousLogger)
	})

	server := NewServer(web.NewHealthSnapshot("opentoggl", []string{"identity"}), nil)
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	request.Header.Set("Traceparent", "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	var record map[string]any
	if err := json.Unmarshal([]byte(strings.TrimSpace(logs.String())), &record); err != nil {
		t.Fatalf("expected request log to emit json, got %q: %v", logs.String(), err)
	}

	if record["traceparent"] != "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01" {
		t.Fatalf("expected request log traceparent, got %#v", record["traceparent"])
	}

	if record["trace_id"] != "4bf92f3577b34da6a3ce929d0e0e4736" {
		t.Fatalf("expected request log trace_id, got %#v", record["trace_id"])
	}

	if record["span_id"] != "00f067aa0ba902b7" {
		t.Fatalf("expected request log span_id, got %#v", record["span_id"])
	}
}

func TestServerLogsHandlerErrorsWithInternalCause(t *testing.T) {
	var logs strings.Builder
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	server := NewServerWithOptions(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		func(server *echo.Echo) {
			server.GET("/boom", func(c echo.Context) error {
				return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").
					SetInternal(errors.New("boom cause"))
			})
		},
		ServerOptions{
			Logger: logger,
		},
	)

	request := httptest.NewRequest(http.MethodGet, "/boom", nil)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected /boom to return 500, got %d", recorder.Code)
	}

	lines := strings.Split(strings.TrimSpace(logs.String()), "\n")
	if len(lines) < 2 {
		t.Fatalf("expected handler error log plus request log, got %q", logs.String())
	}

	var errorRecord map[string]any
	if err := json.Unmarshal([]byte(lines[0]), &errorRecord); err != nil {
		t.Fatalf("expected error log to emit json, got %q: %v", lines[0], err)
	}

	if errorRecord["msg"] != "http handler error" {
		t.Fatalf("expected first log message to be handler error, got %#v", errorRecord["msg"])
	}
	if errorRecord["error"] != "boom cause" {
		t.Fatalf("expected handler error cause to be logged, got %#v", errorRecord["error"])
	}
	if errorRecord["path"] != "/boom" {
		t.Fatalf("expected handler error path /boom, got %#v", errorRecord["path"])
	}
	if _, ok := errorRecord["request_id"]; !ok {
		t.Fatalf("expected handler error log to include request_id, got %#v", errorRecord)
	}
}

func TestServerReturns503WhenReadinessProbeFails(t *testing.T) {
	postgresListener := mustListenTCP(t)
	closedAddress := postgresListener.Addr().String()
	postgresListener.Close()

	redisListener := mustListenTCP(t)
	defer redisListener.Close()

	var logs strings.Builder
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	server := NewServerWithOptions(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		nil,
		ServerOptions{
			Logger: logger,
			Readiness: web.NewStartupReadinessProbe(web.StartupReadinessConfig{
				Service:     "opentoggl",
				DatabaseURL: "postgres://opentoggl@" + closedAddress + "/opentoggl",
				RedisURL:    "redis://" + redisListener.Addr().String() + "/0",
				Timeout:     100 * time.Millisecond,
			}),
		},
	)
	request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	request.Header.Set("Traceparent", "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")
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
	var requestRecord map[string]any
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
		}
		if record["msg"] == "http request" && record["path"] == "/readyz" {
			requestRecord = record
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

	if readinessRecord["target"] != closedAddress {
		t.Fatalf("expected readiness failure log target %q, got %#v", closedAddress, readinessRecord["target"])
	}

	readinessMessage, ok := readinessRecord["message"].(string)
	if !ok || !strings.Contains(readinessMessage, closedAddress) {
		t.Fatalf(
			"expected readiness failure log message to mention %q, got %#v",
			closedAddress,
			readinessRecord["message"],
		)
	}

	if requestRecord == nil {
		t.Fatalf("expected request log for failing /readyz request, got %q", logs.String())
	}

	if requestRecord["method"] != http.MethodGet {
		t.Fatalf("expected /readyz request log method %q, got %#v", http.MethodGet, requestRecord["method"])
	}

	if status, ok := requestRecord["status"].(float64); !ok || int(status) != http.StatusServiceUnavailable {
		t.Fatalf(
			"expected /readyz request log status %d, got %#v",
			http.StatusServiceUnavailable,
			requestRecord["status"],
		)
	}

	if requestRecord["request_id"] == "" {
		t.Fatalf("expected /readyz request log request_id, got %#v", requestRecord["request_id"])
	}

	if requestRecord["trace_id"] != "4bf92f3577b34da6a3ce929d0e0e4736" {
		t.Fatalf("expected /readyz request log trace_id, got %#v", requestRecord["trace_id"])
	}

	if requestRecord["span_id"] != "00f067aa0ba902b7" {
		t.Fatalf("expected /readyz request log span_id, got %#v", requestRecord["span_id"])
	}

	if readinessRecord["request_id"] != requestRecord["request_id"] {
		t.Fatalf(
			"expected readiness failure log request_id %#v to match request log %#v",
			readinessRecord["request_id"],
			requestRecord["request_id"],
		)
	}

	if readinessRecord["trace_id"] != "4bf92f3577b34da6a3ce929d0e0e4736" {
		t.Fatalf("expected readiness failure log trace_id, got %#v", readinessRecord["trace_id"])
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

func mustListenTCP(t *testing.T) net.Listener {
	t.Helper()

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("expected tcp listener to start: %v", err)
	}

	return listener
}
