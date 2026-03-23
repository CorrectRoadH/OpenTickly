package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicTrackOpenAPIServer) PostOrganizationGroup(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.tenant.PostOrganizationGroup(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteOrganizationGroup(ctx echo.Context, organizationId int, groupId int) error {
	_ = organizationId
	_ = groupId
	return server.tenant.DeleteOrganizationGroup(ctx)
}

func (server *publicTrackOpenAPIServer) PatchOrganizationGroup(ctx echo.Context, organizationId int, groupId int) error {
	_ = organizationId
	_ = groupId
	return server.tenant.PatchOrganizationGroup(ctx)
}

func (server *publicTrackOpenAPIServer) PutOrganizationGroup(ctx echo.Context, organizationId int, groupId int) error {
	_ = organizationId
	_ = groupId
	return server.tenant.PutOrganizationGroup(ctx)
}

func (server *publicTrackOpenAPIServer) PostOrganizationSlackIntegrationRequest(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.tenant.PostOrganizationSlackIntegrationRequest(ctx)
}

func (server *publicTrackOpenAPIServer) PatchOrganizationUsers(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.tenant.PatchOrganizationUsers(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteOrganizationUsersLeave(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.tenant.DeleteOrganizationUsersLeave(ctx)
}

func (server *publicTrackOpenAPIServer) PutOrganizationUsers(ctx echo.Context, organizationId int, organizationUserId int) error {
	_ = organizationId
	_ = organizationUserId
	return server.tenant.PutOrganizationUsers(ctx)
}

func (server *publicTrackOpenAPIServer) PatchOrganizationWorkspaceUsers(ctx echo.Context, organizationId int, workspaceId int) error {
	_ = organizationId
	_ = workspaceId
	return server.tenant.PatchOrganizationWorkspaceUsers(ctx)
}

func (server *publicTrackOpenAPIServer) GetOrganizationSegmentation(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.tenant.GetOrganizationSegmentation(ctx)
}

func (server *publicTrackOpenAPIServer) PutOrganizationSegmentation(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.tenant.PutOrganizationSegmentation(ctx)
}
