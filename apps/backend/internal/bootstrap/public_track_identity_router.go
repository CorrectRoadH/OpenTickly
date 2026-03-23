package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *publicTrackOpenAPIServer) GetMe(
	ctx echo.Context,
	params publictrackapi.GetMeParams,
) error {
	_ = params
	return server.identity.GetPublicTrackMe(ctx)
}

func (server *publicTrackOpenAPIServer) PutMe(ctx echo.Context) error {
	return server.identity.PutPublicTrackMe(ctx)
}

func (server *publicTrackOpenAPIServer) PostMeAcceptTos(ctx echo.Context) error {
	return server.identity.PostPublicTrackMeAcceptTOS(ctx)
}

func (server *publicTrackOpenAPIServer) PostCloseAccount(ctx echo.Context) error {
	return server.identity.PostPublicTrackCloseAccount(ctx)
}

func (server *publicTrackOpenAPIServer) PostMeDisableProductEmails(
	ctx echo.Context,
	disableCode string,
) error {
	return server.identity.PostPublicTrackDisableProductEmails(ctx, disableCode)
}

func (server *publicTrackOpenAPIServer) PostMeDisableWeeklyReport(
	ctx echo.Context,
	weeklyReportCode string,
) error {
	return server.identity.PostPublicTrackDisableWeeklyReport(ctx, weeklyReportCode)
}

func (server *publicTrackOpenAPIServer) GetPreferences(ctx echo.Context) error {
	return server.identity.GetPublicTrackPreferences(ctx)
}

func (server *publicTrackOpenAPIServer) PostPreferences(ctx echo.Context) error {
	return server.identity.PostPublicTrackPreferences(ctx)
}

func (server *publicTrackOpenAPIServer) GetPreferencesClient(
	ctx echo.Context,
	client publictrackapi.GetPreferencesClientParamsClient,
) error {
	return server.identity.GetPublicTrackPreferencesClient(ctx, string(client))
}

func (server *publicTrackOpenAPIServer) PostPreferencesClient(
	ctx echo.Context,
	client publictrackapi.PostPreferencesClientParamsClient,
) error {
	return server.identity.PostPublicTrackPreferencesClient(ctx, string(client))
}

func (server *publicTrackOpenAPIServer) PostResetToken(ctx echo.Context) error {
	return server.identity.PostPublicTrackResetToken(ctx)
}

func (server *publicTrackOpenAPIServer) GetMeFeatures(ctx echo.Context) error {
	return server.identity.GetPublicTrackMeFeatures(ctx)
}

func (server *publicTrackOpenAPIServer) GetMeFlags(ctx echo.Context) error {
	return server.identity.GetPublicTrackMeFlags(ctx)
}

func (server *publicTrackOpenAPIServer) PostMeFlags(ctx echo.Context) error {
	return server.identity.PostPublicTrackMeFlags(ctx)
}

func (server *publicTrackOpenAPIServer) GetMeLogged(ctx echo.Context) error {
	return server.identity.GetPublicTrackMeLogged(ctx)
}

func (server *publicTrackOpenAPIServer) GetMeId(ctx echo.Context) error {
	return server.identity.GetPublicTrackMeID(ctx)
}

func (server *publicTrackOpenAPIServer) GetMeLocation(ctx echo.Context) error {
	return server.identity.GetPublicTrackMeLocation(ctx)
}

func (server *publicTrackOpenAPIServer) GetPushServices(ctx echo.Context) error {
	return server.identity.GetPublicTrackPushServices(ctx)
}

func (server *publicTrackOpenAPIServer) PostPushServices(ctx echo.Context) error {
	return server.identity.PostPublicTrackPushServices(ctx)
}

func (server *publicTrackOpenAPIServer) DeletePushServices(ctx echo.Context) error {
	return server.identity.DeletePublicTrackPushServices(ctx)
}

func (server *publicTrackOpenAPIServer) GetDesktopLogin(ctx echo.Context) error {
	return server.identity.GetPublicTrackDesktopLogin(ctx)
}

func (server *publicTrackOpenAPIServer) PostDesktopLoginTokens(ctx echo.Context) error {
	return server.identity.PostPublicTrackDesktopLoginTokens(ctx)
}
