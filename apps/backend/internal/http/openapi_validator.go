package httpapp

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/labstack/echo/v5"
)

type validationContextKey struct{}

func NewOpenAPIValidator(
	spec *openapi3.T,
	skipper func(*echo.Context) bool,
	authenticate func(*echo.Context) error,
) (echo.MiddlewareFunc, error) {
	router, err := gorillamux.NewRouter(spec)
	if err != nil {
		return nil, fmt.Errorf("build OpenAPI validation router: %w", err)
	}
	options := &openapi3filter.Options{KeepValidatedValue: true}
	if authenticate != nil {
		options.AuthenticationFunc = func(ctx context.Context, _ *openapi3filter.AuthenticationInput) error {
			return authenticate(ctx.Value(validationContextKey{}).(*echo.Context))
		}
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			if skipper != nil && skipper(c) {
				return next(c)
			}
			request := c.Request()
			route, params, err := router.FindRoute(request)
			if err != nil {
				var routeError *routers.RouteError
				switch {
				case errors.Is(err, routers.ErrMethodNotAllowed):
					return echo.ErrMethodNotAllowed
				case errors.As(err, &routeError):
					return echo.NewHTTPError(http.StatusNotFound, routeError.Reason)
				default:
					return echo.NewHTTPError(http.StatusInternalServerError, fmt.Sprintf("error validating route: %s", err))
				}
			}
			for name, value := range params {
				if decoded, err := url.PathUnescape(value); err == nil {
					params[name] = decoded
				}
			}

			ctx := context.WithValue(request.Context(), validationContextKey{}, c)
			err = openapi3filter.ValidateRequest(ctx, &openapi3filter.RequestValidationInput{
				Request: request, PathParams: params, Route: route, Options: options,
			})
			if err != nil {
				return validationHTTPError(err)
			}
			return next(c)
		}
	}, nil
}

func validationHTTPError(err error) error {
	switch invalid := err.(type) {
	case *openapi3filter.RequestError:
		return echo.ErrBadRequest.Wrap(err)
	case *openapi3filter.SecurityRequirementsError:
		for _, failure := range invalid.Errors {
			if echo.StatusCode(failure) != 0 {
				return failure
			}
		}
		return echo.ErrForbidden.Wrap(err)
	default:
		return echo.ErrInternalServerError.Wrap(err)
	}
}
