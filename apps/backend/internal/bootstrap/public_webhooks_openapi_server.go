package bootstrap

import (
	publicwebhooksapi "opentoggl/backend/apps/backend/internal/http/generated/publicwebhooks"
	webhookspublicapi "opentoggl/backend/apps/backend/internal/webhooks/transport/http/public-api"
)

type publicWebhooksOpenAPIServer struct {
	webhooks *webhookspublicapi.Handler
}

func newPublicWebhooksOpenAPIServer(handlers *routeHandlers) publicwebhooksapi.ServerInterface {
	return &publicWebhooksOpenAPIServer{
		webhooks: webhookspublicapi.NewHandler(
			handlers,
			handlers.webhooksApp,
		),
	}
}
