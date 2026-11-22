package monitoring

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/labstack/echo/v5"
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
	credentials := newCredentialFilter(dsn)
	return sentry.ClientOptions{Dsn: dsn, Environment: label(environment), Release: label(release), Transport: transport,
		EnableTracing: true, TracesSampleRate: 0.1, SendDefaultPII: false, MaxBreadcrumbs: -1,
		BeforeSendLog:    func(log *sentry.Log) *sentry.Log { return sanitizeLog(log, environment, release) },
		BeforeSendMetric: func(metric *sentry.Metric) *sentry.Metric { return sanitizeMetric(metric, environment, release) },
		BeforeSend: func(e *sentry.Event, hint *sentry.EventHint) *sentry.Event {
			clean := credentials.errorEvent(e, hint)
			clean.Environment = environment
			clean.Release = release
			return clean
		},
		BeforeSendTransaction: func(e *sentry.Event, _ *sentry.EventHint) *sentry.Event {
			return sanitizeTransaction(e, environment, release)
		},
	}
}
func Middleware(client *sentry.Client) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) (err error) {
			if client == nil {
				return next(c)
			}
			scope := sentry.NewScope()
			hub := sentry.NewHub(client, scope)
			request := c.Request()
			route := c.Path()
			operation := RouteOperation(request.Method, route)
			if route == "" {
				route = "unmatched"
			}
			scope.SetTag("route", route)
			scope.SetTag("http.method", request.Method)
			scope.SetTag("http.status_code", strconv.Itoa(http.StatusInternalServerError))
			scope.AddEventProcessor(func(event *sentry.Event, _ *sentry.EventHint) *sentry.Event {
				if event.Type == "transaction" {
					return event
				}
				if event.Transaction == "" {
					event.Transaction = operation
				}
				if event.Request == nil {
					event.Request = &sentry.Request{
						Method: request.Method, URL: request.URL.EscapedPath(), QueryString: request.URL.RawQuery,
					}
				}
				return event
			})

			ctx := sentry.SetHubOnContext(request.Context(), hub)
			transaction := sentry.StartTransaction(ctx, operation, sentry.WithOpName("http.server"), sentry.ContinueFromHeaders(incomingTrace(request.Header.Get("sentry-trace")), ""))
			transaction.SetDynamicSamplingContext(sentry.DynamicSamplingContextFromTransaction(transaction))
			c.SetRequest(request.WithContext(transaction.Context()))
			defer func() {
				defer transaction.Finish()
				if recovered := recover(); recovered != nil {
					_, status := echo.ResolveResponseStatus(c.Response(), echo.ErrInternalServerError)
					scope.SetTag("http.status_code", strconv.Itoa(status))
					panicError, _ := recovered.(error)
					if isClientAbort(panicError) {
						transaction.Status = sentry.SpanStatusCanceled
					} else {
						hub.RecoverWithContext(transaction.Context(), recovered)
						transaction.Status = sentry.SpanStatusInternalError
					}
					panic(recovered)
				}
				_, status := echo.ResolveResponseStatus(c.Response(), err)
				scope.SetTag("http.status_code", strconv.Itoa(status))
				transaction.Status = sentry.HTTPtoSpanStatus(status)
				transaction.SetData("http.response.status_code", status)

				if isClientAbort(err) || isClientAbort(request.Context().Err()) {
					transaction.Status = sentry.SpanStatusCanceled
					return
				}
				errorStatus := echo.StatusCode(err)
				if status >= 500 || (status < 400 && err != nil && (errorStatus == 0 || errorStatus >= 500)) {
					transaction.Status = sentry.SpanStatusInternalError
					if err == nil {
						errForEvent := fmt.Errorf("HTTP %d %s", status, http.StatusText(status))
						hub.CaptureException(errForEvent)
					} else {
						hub.CaptureException(err)
					}
				}
			}()
			return next(c)
		}
	}
}
func isClientAbort(err error) bool {
	return errors.Is(err, context.Canceled) || errors.Is(err, http.ErrAbortHandler)
}

func Flush(client *sentry.Client) {
	if client != nil {
		client.Flush(2 * time.Second)
	}
}
