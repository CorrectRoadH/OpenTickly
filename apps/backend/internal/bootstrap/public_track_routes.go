package bootstrap

import (
	"context"
	"errors"
	"net/http"
	"strings"

	httpapp "opentoggl/backend/apps/backend/internal/http"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	application "opentoggl/backend/apps/backend/internal/identity/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/labstack/echo/v4"
	echomiddleware "github.com/oapi-codegen/echo-middleware"
)

const publicTrackUserContextKey = "public_track_user"

func newPublicTrackRoutes(handlers *routeHandlers) (httpapp.RouteRegistrar, error) {
	swagger, err := publictrackapi.GetSwagger()
	if err != nil {
		return nil, err
	}

	swagger = withAbsoluteTrackPaths(swagger, "/api/v9")
	validator := echomiddleware.OapiRequestValidatorWithOptions(swagger, &echomiddleware.Options{
		Options: openapi3filter.Options{
			AuthenticationFunc: func(ctx context.Context, input *openapi3filter.AuthenticationInput) error {
				echoContext := echomiddleware.GetEchoContext(ctx)
				if echoContext == nil {
					return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
				}
				_, err := handlers.publicTrackUser(echoContext)
				return err
			},
		},
		Skipper: skipPublicTrackOpenAPIValidation,
	})

	return func(server *echo.Echo) {
		group := server.Group("/api/v9")
		group.Use(validator)
		group.Use(newAuditLogMiddleware(handlers))
		publictrackapi.RegisterHandlers(group, newPublicTrackOpenAPIServer(handlers))
	}, nil
}

func withAbsoluteTrackPaths(swagger *openapi3.T, basePath string) *openapi3.T {
	swagger.Servers = nil

	trimmedBasePath := strings.TrimRight(strings.TrimSpace(basePath), "/")
	if trimmedBasePath == "" || swagger.Paths == nil {
		return swagger
	}

	updatedPaths := openapi3.NewPathsWithCapacity(swagger.Paths.Len())
	for path, item := range swagger.Paths.Map() {
		updatedPaths.Set(trimmedBasePath+path, item)
	}
	swagger.Paths = updatedPaths
	return swagger
}

func skipPublicTrackOpenAPIValidation(ctx echo.Context) bool {
	if ctx.Request().Method != http.MethodPatch {
		return false
	}

	path := strings.TrimSpace(ctx.Request().URL.Path)
	if !strings.HasPrefix(path, "/api/v9/workspaces/") {
		return false
	}
	if strings.HasSuffix(path, "/stop") || !strings.Contains(path, "/time_entries/") {
		return false
	}

	// The public Track OpenAPI spec defines both:
	//   /workspaces/{workspace_id}/time_entries/{time_entry_id}
	//   /workspaces/{workspace_id}/time_entries/{time_entry_ids}
	//
	// OAPI path resolution can misclassify PATCH requests against the batch path
	// as "method not allowed" because the single-entry path item does not expose
	// PATCH. Skipping validator matching for batch-style time-entry PATCH keeps
	// routing deterministic while the request is still validated by the handler
	// bind + application layer below.
	return true
}

func publicTrackCredentials(ctx echo.Context) (identitydomain.BasicCredentials, error) {
	username, password, ok := ctx.Request().BasicAuth()
	if !ok {
		return identitydomain.BasicCredentials{}, echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
	}

	return identitydomain.BasicCredentials{
		Username: username,
		Password: password,
	}, nil
}

func (handlers *routeHandlers) publicTrackUser(ctx echo.Context) (*application.UserSnapshot, error) {
	if cached, ok := ctx.Get(publicTrackUserContextKey).(*application.UserSnapshot); ok && cached != nil {
		return cached, nil
	}

	credentials, err := publicTrackCredentials(ctx)
	if err == nil {
		user, resolveErr := handlers.identityApp.ResolveBasicUser(ctx.Request().Context(), credentials)
		switch {
		case resolveErr == nil:
			ctx.Set(publicTrackUserContextKey, &user)
			return &user, nil
		case errors.Is(resolveErr, identitydomain.ErrInvalidCredentials),
			errors.Is(resolveErr, identitydomain.ErrUserDeactivated),
			errors.Is(resolveErr, identitydomain.ErrUserDeleted):
			return nil, echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
		default:
			return nil, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
		}
	}

	currentSessionID := sessionID(ctx)
	if currentSessionID == "" {
		return nil, err
	}

	user, resolveErr := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), currentSessionID)
	switch {
	case resolveErr == nil:
		ctx.Set(publicTrackUserContextKey, &user)
		return &user, nil
	case errors.Is(resolveErr, application.ErrSessionNotFound),
		errors.Is(resolveErr, identitydomain.ErrInvalidCredentials),
		errors.Is(resolveErr, identitydomain.ErrUserDeactivated),
		errors.Is(resolveErr, identitydomain.ErrUserDeleted):
		return nil, echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
	default:
		return nil, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
}
