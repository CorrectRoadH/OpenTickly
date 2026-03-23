package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicTrackOpenAPIServer) GetAllPlans(ctx echo.Context) error {
	return server.billing.GetPublicTrackPlans(ctx)
}

func (server *publicTrackOpenAPIServer) GetPublicSubscriptionPlans(ctx echo.Context) error {
	return server.billing.GetPublicTrackPlans(ctx)
}
