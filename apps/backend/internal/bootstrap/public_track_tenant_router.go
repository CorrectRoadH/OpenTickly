package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *publicTrackOpenAPIServer) GetOrganizations(ctx echo.Context) error {
	return server.tenant.GetPublicTrackOrganizations(ctx)
}

func (server *publicTrackOpenAPIServer) GetQuota(ctx echo.Context) error {
	return server.tenant.GetPublicTrackQuota(ctx)
}

func (server *publicTrackOpenAPIServer) PostOrganization(ctx echo.Context) error {
	return server.tenant.PostPublicTrackOrganization(ctx)
}

func (server *publicTrackOpenAPIServer) PostOrganizationWorkspaces(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.tenant.PostPublicTrackOrganizationWorkspace(ctx)
}

func (server *publicTrackOpenAPIServer) GetOrganization(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.tenant.GetPublicTrackOrganization(ctx)
}

func (server *publicTrackOpenAPIServer) GetOrganizationGroups(
	ctx echo.Context,
	organizationId int,
	params publictrackapi.GetOrganizationGroupsParams,
) error {
	_ = organizationId
	_ = params
	return server.tenant.GetPublicTrackOrganizationGroups(ctx)
}

func (server *publicTrackOpenAPIServer) GetOrganizationUsers(
	ctx echo.Context,
	organizationId int,
	params publictrackapi.GetOrganizationUsersParams,
) error {
	_ = organizationId
	return server.tenant.GetPublicTrackOrganizationUsers(ctx, params)
}

func (server *publicTrackOpenAPIServer) GetOrganizationUsersDetailed(
	ctx echo.Context,
	organizationId int,
	params publictrackapi.GetOrganizationUsersDetailedParams,
) error {
	_ = organizationId
	return server.tenant.GetPublicTrackOrganizationUsersDetailed(ctx, params)
}

func (server *publicTrackOpenAPIServer) PutOrganization(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.tenant.PutPublicTrackOrganization(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspace(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tenant.GetPublicTrackWorkspace(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspacePreferences(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tenant.GetPublicTrackWorkspacePreferences(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspacePreferences(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tenant.PostPublicTrackWorkspacePreferences(ctx)
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

func (server *publicTrackOpenAPIServer) GetOrganizationWorkspacesGroups(
	ctx echo.Context,
	organizationId int,
	workspaceId int,
) error {
	_ = organizationId
	_ = workspaceId
	return server.tenant.GetPublicTrackOrganizationWorkspaceGroups(ctx)
}

func (server *publicTrackOpenAPIServer) GetOrganizationWorkspacesWorkspaceusers(
	ctx echo.Context,
	organizationId int,
	workspaceId int,
	params publictrackapi.GetOrganizationWorkspacesWorkspaceusersParams,
) error {
	_ = organizationId
	_ = workspaceId
	_ = params
	return server.tenant.GetPublicTrackOrganizationWorkspaceUsers(ctx)
}
