package httpapp

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"opentoggl/backend/apps/backend/internal/http/httperror"

	"github.com/labstack/echo/v5"
)

func newHTTPErrorHandler(logger *slog.Logger) echo.HTTPErrorHandler {
	writeDefault := echo.DefaultHTTPErrorHandler(false)
	return func(c *echo.Context, err error) {
		response, _ := echo.UnwrapResponse(c.Response())
		if response != nil && response.Committed {
			return
		}

		_, status := echo.ResolveResponseStatus(c.Response(), err)
		loggedError := err
		responseError := err
		var payload any
		var structured bool

		var handlerError *httperror.Error
		var frameworkError *echo.HTTPError
		switch {
		case errors.As(err, &handlerError):
			if handlerError.Cause != nil {
				loggedError = handlerError.Cause
			}
			payload = handlerError.Message
			message, isString := payload.(string)
			structured = !isString
			responseError = echo.NewHTTPError(status, errorMessage(message, handlerError.Cause, loggedError))
		case errors.As(err, &frameworkError):
			cause := frameworkError.Unwrap()
			if cause != nil {
				loggedError = cause
			}
			responseError = echo.NewHTTPError(status, errorMessage(frameworkError.Message, cause, loggedError))
		}

		if status >= http.StatusBadRequest {
			correlation := requestCorrelationFromRequest(c.Request(), requestIDFromContext(c))
			fields := []any{
				"method", c.Request().Method,
				"path", c.Request().URL.Path,
				"status", status,
				"error", loggedError.Error(),
			}
			fields = append(fields, correlation.logFields()...)
			if status >= http.StatusInternalServerError {
				logger.ErrorContext(c.Request().Context(), "http handler error", fields...)
			} else {
				logger.WarnContext(c.Request().Context(), "http handler error", fields...)
			}
		}

		if structured && payload != nil {
			if writeErr := c.JSON(status, payload); writeErr != nil {
				logger.ErrorContext(c.Request().Context(), "failed to write structured http error",
					"path", c.Request().URL.Path,
					"status", status,
					"error", writeErr.Error(),
				)
			}
			return
		}

		writeDefault(c, responseError)
	}
}

func errorMessage(message string, cause, fallback error) string {
	if cause != nil {
		return cause.Error()
	}
	if strings.TrimSpace(message) != "" {
		return message
	}
	return fallback.Error()
}
