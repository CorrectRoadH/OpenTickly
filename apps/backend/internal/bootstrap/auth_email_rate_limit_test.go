package bootstrap

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func contextForIP(t *testing.T, ip string) echo.Context {
	t.Helper()
	request := httptest.NewRequest(http.MethodPost, "/web/v1/auth/verify-email/resend", nil)
	request.RemoteAddr = ip + ":54321"
	return echo.New().NewContext(request, httptest.NewRecorder())
}

func TestAuthEmailRateLimiterAllowsBurstThenBlocks(t *testing.T) {
	limiter := newAuthEmailRateLimiter()
	ctx := contextForIP(t, "203.0.113.10")

	for attempt := 1; attempt <= authEmailRateLimitBurst; attempt++ {
		if err := limiter.allow(ctx); err != nil {
			t.Fatalf("attempt %d should be allowed, got %v", attempt, err)
		}
	}

	err := limiter.allow(ctx)
	if err == nil {
		t.Fatalf("expected the request past the burst to be rejected")
	}
	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected an echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", httpErr.Code)
	}
}

func TestAuthEmailRateLimiterIsPerClient(t *testing.T) {
	limiter := newAuthEmailRateLimiter()
	noisy := contextForIP(t, "203.0.113.10")
	for attempt := 0; attempt <= authEmailRateLimitBurst; attempt++ {
		_ = limiter.allow(noisy)
	}

	if err := limiter.allow(contextForIP(t, "203.0.113.11")); err != nil {
		t.Fatalf("a different client must not inherit the block, got %v", err)
	}
}
