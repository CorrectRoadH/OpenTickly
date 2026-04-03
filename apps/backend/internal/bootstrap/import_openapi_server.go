package bootstrap

import (
	importapi "opentoggl/backend/apps/backend/internal/http/generated/import"
	importingpublicapi "opentoggl/backend/apps/backend/internal/importing/transport/http/public-api"

	"github.com/labstack/echo/v4"
)

type importOpenAPIServer struct {
	importing *importingpublicapi.Handler
}

func newImportOpenAPIServer(handlers *routeHandlers) importapi.ServerInterface {
	return &importOpenAPIServer{
		importing: importingpublicapi.NewHandler(
			handlers.importingApp,
			handlers,
			handlers.tenantApp,
			handlers.membershipApp,
			handlers.userHomes,
			handlers.catalogApp,
			handlers.membershipApp,
			handlers.governanceApp,
			handlers.trackingApp,
			handlers.reportsApp,
			handlers.invoiceApp,
			handlers.tenantApp,
		),
	}
}

func (server *importOpenAPIServer) CreateImportJob(ctx echo.Context) error {
	return server.importing.CreateImportJob(ctx)
}

func (server *importOpenAPIServer) GetImportJob(ctx echo.Context, jobId string) error {
	return server.importing.GetImportJob(ctx, jobId)
}
