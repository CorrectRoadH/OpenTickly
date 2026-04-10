package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicWebhooksOpenAPIServer) GetEventFilters(ctx echo.Context) error {
	return server.webhooks.GetEventFilters(ctx)
}

func (server *publicWebhooksOpenAPIServer) GetWorkspaceLimits(ctx echo.Context, workspaceId int) error {
	return server.webhooks.GetWorkspaceLimits(ctx, workspaceId)
}

func (server *publicWebhooksOpenAPIServer) GetStatus(ctx echo.Context) error {
	return server.webhooks.GetStatus(ctx)
}

func (server *publicWebhooksOpenAPIServer) GetSubscriptions(ctx echo.Context, workspaceId int) error {
	return server.webhooks.GetSubscriptions(ctx, workspaceId)
}

func (server *publicWebhooksOpenAPIServer) PostSubscription(ctx echo.Context, workspaceId int) error {
	return server.webhooks.PostSubscription(ctx, workspaceId)
}

func (server *publicWebhooksOpenAPIServer) UpdateSubscription(ctx echo.Context, workspaceId int, subscriptionId int) error {
	return server.webhooks.UpdateSubscription(ctx, workspaceId, subscriptionId)
}

func (server *publicWebhooksOpenAPIServer) PatchSubscription(ctx echo.Context, workspaceId int, subscriptionId int) error {
	return server.webhooks.PatchSubscription(ctx, workspaceId, subscriptionId)
}

func (server *publicWebhooksOpenAPIServer) DeleteSubscription(ctx echo.Context, workspaceId int, subscriptionId int) error {
	return server.webhooks.DeleteSubscription(ctx, workspaceId, subscriptionId)
}

func (server *publicWebhooksOpenAPIServer) PostPing(ctx echo.Context, workspaceId int, subscriptionId int) error {
	return server.webhooks.PostPing(ctx, workspaceId, subscriptionId)
}

func (server *publicWebhooksOpenAPIServer) GetValidate(ctx echo.Context, workspaceId int, subscriptionId int, validationCode string) error {
	return server.webhooks.GetValidate(ctx, workspaceId, subscriptionId, validationCode)
}
