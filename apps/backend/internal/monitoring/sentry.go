package monitoring

import (
	"errors"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/labstack/echo/v4"
)

var projectPath = regexp.MustCompile(`^/[0-9]+$`)

func New(dsn, environment, release string) *sentry.Client {
	u, err := url.Parse(dsn)
	if err != nil || u.Scheme != "https" || u.Host == "" || u.User == nil || u.User.Username() == "" || u.RawQuery != "" || u.Fragment != "" || !projectPath.MatchString(u.Path) {
		return nil
	}
	if _, hasPassword := u.User.Password(); hasPassword {
		return nil
	}
	client, err := sentry.NewClient(Options(dsn, environment, release, nil))
	if err != nil {
		return nil
	}
	return client
}
func label(value string) string {
	if len(value) > 200 || strings.IndexFunc(value, func(r rune) bool { return r < 32 || r == 127 }) >= 0 {
		return ""
	}
	return value
}
func Options(dsn, environment, release string, transport sentry.Transport) sentry.ClientOptions {
	environment = label(environment)
	if environment == "" {
		environment = "production"
	}
	release = label(release)
	return sentry.ClientOptions{Dsn: dsn, Environment: label(environment), Release: label(release), Transport: transport,
		EnableTracing: true, TracesSampleRate: 0.1, SendDefaultPII: false, MaxBreadcrumbs: -1,
		BeforeSend:            func(e *sentry.Event, _ *sentry.EventHint) *sentry.Event { return sanitize(e, environment, release) },
		BeforeSendTransaction: func(e *sentry.Event, _ *sentry.EventHint) *sentry.Event { return sanitize(e, environment, release) },
	}
}
func Middleware(client *sentry.Client) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) (err error) {
			if client == nil {
				return next(c)
			}
			hub := sentry.NewHub(client, sentry.NewScope())
			ctx := sentry.SetHubOnContext(c.Request().Context(), hub)
			transaction := sentry.StartTransaction(ctx, "http.server", sentry.WithOpName("http.server"), sentry.ContinueFromRequest(c.Request()))
			c.SetRequest(c.Request().WithContext(transaction.Context()))
			defer func() {
				if recovered := recover(); recovered != nil {
					hub.RecoverWithContext(transaction.Context(), recovered)
					transaction.Status = sentry.SpanStatusInternalError
					transaction.Finish()
					panic(recovered)
				}
				if err != nil {
					status := 500
					var httpErr *echo.HTTPError
					if errors.As(err, &httpErr) {
						status = httpErr.Code
					}
					if status >= 500 {
						hub.CaptureException(err)
						transaction.Status = sentry.SpanStatusInternalError
					}
				}
				if err == nil && c.Response().Status >= 500 {
					hub.CaptureMessage("Application error")
					transaction.Status = sentry.SpanStatusInternalError
				}
				transaction.Finish()
			}()
			return next(c)
		}
	}
}
func Flush(client *sentry.Client) {
	if client != nil {
		client.Flush(2 * time.Second)
	}
}
