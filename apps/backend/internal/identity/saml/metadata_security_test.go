package saml

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"opentoggl/backend/apps/backend/internal/platform/safehttp"
	"sync/atomic"
	"testing"
)

func TestMetadataRejectsPrivateNetworkBeforeDial(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requests.Add(1)
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()
	_, err := ResolveIDPMetadata(context.Background(), Config{IDPMetadataURL: server.URL}, nil)
	if err == nil {
		t.Fatal("private metadata URL must be rejected")
	}
	if got := requests.Load(); got != 0 {
		t.Fatalf("untrusted metadata URL reached an internal server: %d request(s)", got)
	}
}

func TestMetadataRejectsPrivateHTTPS(t *testing.T) {
	for _, raw := range []string{"https://127.0.0.1/metadata", "https://[::1]/metadata", "https://localhost/metadata"} {
		_, err := ResolveIDPMetadata(context.Background(), Config{IDPMetadataURL: raw}, nil)
		if !errors.Is(err, safehttp.ErrForbiddenTarget) {
			t.Fatalf("%s: expected address policy rejection, got %v", raw, err)
		}
	}
}
