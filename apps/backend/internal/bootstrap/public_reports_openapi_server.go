package bootstrap

import (
	publicreportsapi "opentoggl/backend/apps/backend/internal/http/generated/publicreports"
	reportspublicapi "opentoggl/backend/apps/backend/internal/reports/transport/http/public-api"
)

type publicReportsOpenAPIServer struct {
	*publicReportsUnimplementedServer
	reports *reportspublicapi.Handler
}

func newPublicReportsOpenAPIServer(handlers *routeHandlers) publicreportsapi.ServerInterface {
	return &publicReportsOpenAPIServer{
		publicReportsUnimplementedServer: &publicReportsUnimplementedServer{},
		reports:                          reportspublicapi.NewHandler(handlers, handlers.reportsApp),
	}
}
