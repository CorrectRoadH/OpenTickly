package bootstrap

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"
)

// authEmailRateLimitBurst is how many forgot-password / resend-verification
// requests one client may fire back to back before the sustained rate applies.
const authEmailRateLimitBurst = 5

// authEmailRateLimitInterval is the sustained refill rate per client.
const authEmailRateLimitInterval = time.Minute

// authEmailRateLimiter throttles the unauthenticated endpoints that mail an
// address chosen by the caller — forgot-password and resend-verification.
// The per-user cooldowns inside the identity service only slow repeats for a
// single address, so without a per-client cap these endpoints are an email
// bombing amplifier against any address the caller can name.
type authEmailRateLimiter struct {
	store *middleware.RateLimiterMemoryStore
}

func newAuthEmailRateLimiter() *authEmailRateLimiter {
	return &authEmailRateLimiter{
		store: middleware.NewRateLimiterMemoryStoreWithConfig(middleware.RateLimiterMemoryStoreConfig{
			Rate:      rate.Every(authEmailRateLimitInterval),
			Burst:     authEmailRateLimitBurst,
			ExpiresIn: time.Hour,
		}),
	}
}

// allow returns nil when the request may proceed, or a 429 otherwise.
func (limiter *authEmailRateLimiter) allow(ctx echo.Context) error {
	allowed, err := limiter.store.Allow(ctx.RealIP())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	if !allowed {
		return echo.NewHTTPError(http.StatusTooManyRequests, authPreconditionBody{
			Error:   "rate_limited",
			Message: "Too many email requests from this client. Wait a minute and try again.",
		})
	}
	return nil
}
