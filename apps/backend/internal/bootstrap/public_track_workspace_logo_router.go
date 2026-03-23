package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicTrackOpenAPIServer) GetWorkspaceLogo(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tenant.GetPublicTrackWorkspaceLogo(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceLogo(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tenant.PostPublicTrackWorkspaceLogo(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteWorkspaceLogo(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tenant.DeletePublicTrackWorkspaceLogo(ctx)
}
