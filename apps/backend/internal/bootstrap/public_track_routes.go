package bootstrap

import (
	"context"
	"errors"
	"net/http"
	"strings"

	httpapp "opentoggl/backend/apps/backend/internal/http"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	tenantweb "opentoggl/backend/apps/backend/internal/tenant/transport/http/web"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	echomiddleware "github.com/oapi-codegen/echo-middleware"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

const publicTrackUserContextKey = "public_track_user"

func newPublicTrackRoutes(pool *pgxpool.Pool) (httpapp.RouteRegistrar, error) {
	runtime, err := newWebRuntime(pool)
	if err != nil {
		return nil, err
	}

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
				_, err := runtime.publicTrackUser(echoContext)
				return err
			},
		},
	})

	return func(server *echo.Echo) {
		group := server.Group("/api/v9")
		group.Use(validator)
		publictrackapi.RegisterHandlers(group, newBootstrapPublicTrackOpenAPIServer(runtime))
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

func (runtime *webRuntime) getPublicTrackMe(ctx echo.Context) error {
	credentials, err := publicTrackCredentials(ctx)
	if err != nil {
		return err
	}
	response := runtime.identityAPI.GetMe(ctx.Request().Context(), credentials)
	return ctx.JSON(response.StatusCode, response.Body)
}

func (runtime *webRuntime) putPublicTrackMe(ctx echo.Context) error {
	credentials, err := publicTrackCredentials(ctx)
	if err != nil {
		return err
	}

	var request publictrackapi.MePayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	response := runtime.identityAPI.PutMe(ctx.Request().Context(), credentials, identitydomain.ProfileUpdate{
		CurrentPassword:    stringValue(request.CurrentPassword),
		Password:           stringValue(request.Password),
		Email:              emailValue(request.Email),
		FullName:           stringValue(request.Fullname),
		Timezone:           stringValue(request.Timezone),
		BeginningOfWeek:    request.BeginningOfWeek,
		CountryID:          int64PointerFromTrackIntPointer(request.CountryId),
		DefaultWorkspaceID: int64PointerFromTrackIntPointer(request.DefaultWorkspaceId),
	})

	return ctx.JSON(response.StatusCode, response.Body)
}

func (runtime *webRuntime) getPublicTrackPreferences(ctx echo.Context) error {
	credentials, err := publicTrackCredentials(ctx)
	if err != nil {
		return err
	}
	response := runtime.identityAPI.GetPreferences(ctx.Request().Context(), credentials, "web")
	return ctx.JSON(response.StatusCode, response.Body)
}

func (runtime *webRuntime) postPublicTrackPreferences(ctx echo.Context) error {
	credentials, err := publicTrackCredentials(ctx)
	if err != nil {
		return err
	}

	var request publictrackapi.ModelsAllPreferences
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	response := runtime.identityAPI.PostPreferences(ctx.Request().Context(), credentials, "web", identitydomain.Preferences{
		DateFormat:      stringValue(request.DateFormat),
		TimeOfDayFormat: normalizeTrackTimeOfDayFormat(stringValue(request.TimeofdayFormat)),
		AlphaFeatures:   alphaFeaturesFromPublicTrack(request.AlphaFeatures),
	})

	return ctx.JSON(response.StatusCode, response.Body)
}

func (runtime *webRuntime) postPublicTrackResetToken(ctx echo.Context) error {
	credentials, err := publicTrackCredentials(ctx)
	if err != nil {
		return err
	}
	response := runtime.identityAPI.PostResetToken(ctx.Request().Context(), credentials)
	return ctx.JSON(response.StatusCode, response.Body)
}

func (runtime *webRuntime) getPublicTrackOrganization(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := runtime.requirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}

	response := runtime.tenant.GetOrganizationSettings(ctx.Request().Context(), organizationID)
	if body, ok := response.Body.(map[string]any); ok {
		return ctx.JSON(response.StatusCode, body["organization"])
	}
	return ctx.JSON(response.StatusCode, response.Body)
}

func (runtime *webRuntime) putPublicTrackOrganization(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := runtime.requirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}

	var request publictrackapi.ModelsPutPayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	response := runtime.tenant.UpdateOrganizationSettings(ctx.Request().Context(), organizationID, tenantweb.OrganizationSettingsRequest{
		Organization: struct {
			Name string `json:"name"`
		}{
			Name: stringValue(request.Name),
		},
	})

	if body, ok := response.Body.(map[string]any); ok {
		return ctx.JSON(response.StatusCode, body["organization"])
	}
	return ctx.JSON(response.StatusCode, response.Body)
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

func (runtime *webRuntime) publicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error) {
	if cached, ok := ctx.Get(publicTrackUserContextKey).(*identityapplication.UserSnapshot); ok && cached != nil {
		return cached, nil
	}

	credentials, err := publicTrackCredentials(ctx)
	if err != nil {
		return nil, err
	}

	user, resolveErr := runtime.identityApp.ResolveBasicUser(ctx.Request().Context(), credentials)
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

func stringValue(value *string) string {
	if value == nil {
		return ""
	}

	return *value
}

func normalizeTrackTimeOfDayFormat(value string) string {
	if strings.TrimSpace(value) == "h:mm a" {
		return "h:mm A"
	}

	return value
}

func emailValue(value *openapi_types.Email) string {
	if value == nil {
		return ""
	}

	return string(*value)
}

func int64PointerFromTrackIntPointer(value *int) *int64 {
	if value == nil {
		return nil
	}

	converted := int64(*value)
	return &converted
}

func alphaFeaturesFromPublicTrack(values *[]publictrackapi.ModelsAlphaFeature) []identitydomain.AlphaFeature {
	if values == nil {
		return nil
	}

	features := make([]identitydomain.AlphaFeature, 0, len(*values))
	for _, value := range *values {
		features = append(features, identitydomain.AlphaFeature{
			Code:    stringValue(value.Code),
			Enabled: boolValue(value.Enabled),
		})
	}

	return features
}

func boolValue(value *bool) bool {
	if value == nil {
		return false
	}

	return *value
}
