package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicTrackOpenAPIServer) GetAllPlans(ctx echo.Context) error {
	return server.billing.GetPublicTrackPlans(ctx)
}

func (server *publicTrackOpenAPIServer) GetPublicSubscriptionPlans(ctx echo.Context) error {
	return server.billing.GetPublicTrackPlans(ctx)
}

func (server *publicTrackOpenAPIServer) GetOrganizationsPlans(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.GetPublicTrackOrganizationPlans(ctx)
}

func (server *publicTrackOpenAPIServer) GetOrganizationsPlan(
	ctx echo.Context,
	organizationId int,
	planId int,
) error {
	_ = organizationId
	_ = planId
	return server.billing.GetPublicTrackOrganizationPlan(ctx)
}

func (server *publicTrackOpenAPIServer) GetOrganizationUsage(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.GetPublicTrackOrganizationUsage(ctx)
}
