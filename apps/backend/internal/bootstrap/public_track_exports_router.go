package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicTrackOpenAPIServer) GetMeExport(ctx echo.Context) error {
	return server.importing.GetPublicTrackMeExport(ctx)
}

func (server *publicTrackOpenAPIServer) PostMeExport(ctx echo.Context) error {
	return server.importing.PostPublicTrackMeExport(ctx)
}

func (server *publicTrackOpenAPIServer) GetMeExportDataUuidZip(ctx echo.Context, uuid string) error {
	return server.importing.GetPublicTrackMeExportArchive(ctx, uuid)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceExports(ctx echo.Context, workspaceId int) error {
	return server.importing.GetPublicTrackWorkspaceExports(ctx, int64(workspaceId))
}

func (server *publicTrackOpenAPIServer) PostWorkspaceExports(ctx echo.Context, workspaceId int) error {
	return server.importing.PostPublicTrackWorkspaceExports(ctx, int64(workspaceId))
}

func (server *publicTrackOpenAPIServer) GetWorkspaceExportsDataUuidZip(
	ctx echo.Context,
	workspaceId int,
	uuid string,
) error {
	return server.importing.GetPublicTrackWorkspaceExportArchive(ctx, int64(workspaceId), uuid)
}
