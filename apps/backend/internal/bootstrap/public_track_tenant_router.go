package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicTrackOpenAPIServer) GetOrganizations(ctx echo.Context) error {
	return server.tenant.GetPublicTrackOrganizations(ctx)
}

func (server *publicTrackOpenAPIServer) GetQuota(ctx echo.Context) error {
	return server.tenant.GetPublicTrackQuota(ctx)
}

func (server *publicTrackOpenAPIServer) PostOrganization(ctx echo.Context) error {
	return server.tenant.PostPublicTrackOrganization(ctx)
}

func (server *publicTrackOpenAPIServer) GetOrganization(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.tenant.GetPublicTrackOrganization(ctx)
}

func (server *publicTrackOpenAPIServer) PutOrganization(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.tenant.PutPublicTrackOrganization(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspace(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tenant.GetPublicTrackWorkspace(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaces(ctx echo.Context) error {
	return server.tenant.GetPublicTrackWorkspaces(ctx)
}

func (server *publicTrackOpenAPIServer) PutWorkspaces(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tenant.PutPublicTrackWorkspace(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceSubscription(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tenant.GetPublicTrackWorkspaceSubscription(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceStatistics(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tenant.GetPublicTrackWorkspaceStatistics(ctx)
}
