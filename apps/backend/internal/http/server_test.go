package httpapp

import (
	"encoding/json"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"opentoggl/backend/apps/backend/internal/web"
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

	for _, path := range []string{"/healthz", "/readyz"} {
		request := httptest.NewRequest(http.MethodGet, path, nil)
		recorder := httptest.NewRecorder()

		server.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected %s to return 200, got %d", path, recorder.Code)
		}

		var response map[string]any
		if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
			t.Fatalf("expected %s response to be valid json: %v", path, err)
		}

		if _, ok := response["service"]; !ok {
			t.Fatalf("expected %s response to include service", path)
		}
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

func mustReadEmbeddedIndexHTML(t *testing.T) string {
	t.Helper()

	indexHTML, err := fs.ReadFile(web.StaticFiles(), "index.html")
	if err != nil {
		t.Fatalf("expected embedded index.html to exist: %v", err)
	}

	return string(indexHTML)
}
