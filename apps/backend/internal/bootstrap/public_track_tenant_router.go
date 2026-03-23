package bootstrap

import "github.com/labstack/echo/v4"

func (server *bootstrapPublicTrackOpenAPIServer) GetOrganization(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.runtime.getPublicTrackOrganization(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PutOrganization(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.runtime.putPublicTrackOrganization(ctx)
}
