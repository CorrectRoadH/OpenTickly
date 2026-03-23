package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicTrackOpenAPIServer) GetInvitations(ctx echo.Context, invitationCode string) error {
	return server.membership.GetPublicTrackInvitation(ctx, invitationCode)
}

func (server *publicTrackOpenAPIServer) PostOrganizationAcceptInvitation(ctx echo.Context, invitationCode string) error {
	return server.membership.PostPublicTrackOrganizationAcceptInvitation(ctx, invitationCode)
}

func (server *publicTrackOpenAPIServer) PostRejectInvitation(ctx echo.Context, invitationCode string) error {
	return server.membership.PostPublicTrackRejectInvitation(ctx, invitationCode)
}

func (server *publicTrackOpenAPIServer) PostOrganizationInvitation(ctx echo.Context, organizationId int) error {
	return server.membership.PostPublicTrackOrganizationInvitation(ctx, int64(organizationId))
}

func (server *publicTrackOpenAPIServer) PutInvitation(ctx echo.Context, organizationId int, invitationId int) error {
	return server.membership.PutPublicTrackInvitation(ctx, int64(organizationId), int64(invitationId))
}
