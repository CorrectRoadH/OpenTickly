package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *publicTrackOpenAPIServer) CreateRate(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.catalog.PostPublicTrackRate(ctx)
}

func (server *publicTrackOpenAPIServer) GetRatesByLevel(
	ctx echo.Context,
	workspaceId int,
	level string,
	levelId int,
	params publictrackapi.GetRatesByLevelParams,
) error {
	_ = workspaceId
	_ = level
	_ = levelId
	_ = params
	return server.catalog.GetPublicTrackRatesByLevel(ctx)
}
