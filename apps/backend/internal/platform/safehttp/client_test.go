package safehttp

import (
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestValidateURL(t *testing.T) {
	cases := []struct {
		name    string
		in      string
		wantErr bool
	}{
		{"https ok", "https://example.com/hook", false},
		{"http ok", "http://example.com/hook", false},
		{"missing host", "https:///hook", true},
		{"ftp rejected", "ftp://example.com/hook", true},
		{"file rejected", "file:///etc/passwd", true},
		{"empty", "", true},
		{"garbage", "::::", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateURL(tc.in)
			if tc.wantErr && err == nil {
				t.Fatalf("expected error for %q, got nil", tc.in)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error for %q: %v", tc.in, err)
			}
		})
	}
}

func TestIsForbiddenIP(t *testing.T) {
	forbidden := []string{
		"127.0.0.1", "127.1.2.3",
		"10.0.0.1", "172.16.0.1", "192.168.1.1",
		"169.254.169.254", // AWS/GCP metadata
		"100.64.0.1",      // CGNAT
		"0.0.0.0",
		"::1", "fe80::1", "fc00::1",
	}
	for _, s := range forbidden {
		ip := net.ParseIP(s)
		if !isForbiddenIP(ip) {
			t.Errorf("expected %s to be forbidden", s)
		}
	}
	allowed := []string{
		"1.1.1.1", "8.8.8.8", "93.184.216.34",
		"2606:4700:4700::1111",
	}
	for _, s := range allowed {
		ip := net.ParseIP(s)
		if isForbiddenIP(ip) {
			t.Errorf("expected %s to be allowed", s)
		}
	}
}

// TestClientBlocksLoopback verifies the end-to-end guard: a request to a
// loopback-bound test server must fail without the request ever reaching the
// handler. This proves the Transport rejects the target before any TCP
// handshake completes.
func TestClientBlocksLoopback(t *testing.T) {
	var handlerCalled bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewClient(Options{})
	resp, err := client.Get(server.URL)
	if err == nil {
		resp.Body.Close()
		t.Fatalf("expected an error when targeting loopback, got nil")
	}
	if !strings.Contains(err.Error(), ErrForbiddenTarget.Error()) && !errors.Is(err, ErrForbiddenTarget) {
		t.Fatalf("expected ErrForbiddenTarget, got %v", err)
	}
	if handlerCalled {
		t.Fatal("server handler was invoked despite SSRF guard")
	}
}

// TestClientAllowsLoopbackWhenOptedIn verifies that AllowPrivateTargets=true
// is an actual escape hatch so operators running purely on a trusted LAN can
// opt back in.
func TestClientAllowsLoopbackWhenOptedIn(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewClient(Options{AllowPrivateTargets: true})
	resp, err := client.Get(server.URL)
	if err != nil {
		t.Fatalf("expected request to succeed with AllowPrivateTargets, got %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

// TestClientDoesNotFollowRedirects ensures a malicious public host cannot
// smuggle the client onto a forbidden target via a 302 Location header.
func TestClientDoesNotFollowRedirects(t *testing.T) {
	var redirectHandlerCalled bool
	redirectTarget := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		redirectHandlerCalled = true
		w.WriteHeader(http.StatusOK)
	}))
	defer redirectTarget.Close()

	originServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, redirectTarget.URL, http.StatusFound)
	}))
	defer originServer.Close()

	client := NewClient(Options{AllowPrivateTargets: true})
	resp, err := client.Get(originServer.URL)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusFound {
		t.Fatalf("expected 302 (redirect not followed), got %d", resp.StatusCode)
	}
	if redirectHandlerCalled {
		t.Fatal("redirect target was reached; client should not follow redirects")
	}
}
