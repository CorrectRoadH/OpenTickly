package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *bootstrapPublicTrackOpenAPIServer) GetMe(
	ctx echo.Context,
	params publictrackapi.GetMeParams,
) error {
	_ = params
	return server.runtime.getPublicTrackMe(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PutMe(ctx echo.Context) error {
	return server.runtime.putPublicTrackMe(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetPreferences(ctx echo.Context) error {
	return server.runtime.getPublicTrackPreferences(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostPreferences(ctx echo.Context) error {
	return server.runtime.postPublicTrackPreferences(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostResetToken(ctx echo.Context) error {
	return server.runtime.postPublicTrackResetToken(ctx)
}
