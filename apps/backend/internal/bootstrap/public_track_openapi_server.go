package bootstrap

import (
	billingpublicapi "opentoggl/backend/apps/backend/internal/billing/transport/http/public-api"
	catalogpublicapi "opentoggl/backend/apps/backend/internal/catalog/transport/http/public-api"
	governancepublicapi "opentoggl/backend/apps/backend/internal/governance/transport/http/public-api"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identitypublicapi "opentoggl/backend/apps/backend/internal/identity/transport/http/public-api"
	importingpublicapi "opentoggl/backend/apps/backend/internal/importing/transport/http/public-api"
	membershippublicapi "opentoggl/backend/apps/backend/internal/membership/transport/http/public-api"
	platformpublicapi "opentoggl/backend/apps/backend/internal/platform/transport/http/public-api"
	reportspublicapi "opentoggl/backend/apps/backend/internal/reports/transport/http/public-api"
	tenantpublicapi "opentoggl/backend/apps/backend/internal/tenant/transport/http/public-api"
	trackingpublicapi "opentoggl/backend/apps/backend/internal/tracking/transport/http/public-api"
)

type publicTrackOpenAPIServer struct {
	*publicTrackUnimplementedServer
	identity   *identitypublicapi.PublicTrackHandler
	tenant     *tenantpublicapi.Handler
	membership *membershippublicapi.Handler
	importing  *importingpublicapi.Handler
	catalog    *catalogpublicapi.Handler
	tracking   *trackingpublicapi.Handler
	governance *governancepublicapi.Handler
	platform   *platformpublicapi.Handler
	billing    *billingpublicapi.Handler
	reports    *reportspublicapi.Handler
}

func newPublicTrackOpenAPIServer(handlers *routeHandlers) publictrackapi.ServerInterface {
	return &publicTrackOpenAPIServer{
		publicTrackUnimplementedServer: &publicTrackUnimplementedServer{},
		identity:                       identitypublicapi.NewPublicTrackHandler(handlers.identityAPI, handlers.referenceApp, handlers.fileStore),
		tenant: tenantpublicapi.NewHandler(
			handlers.tenantApp,
			handlers.billingApp,
			handlers.catalogApp,
			handlers.membershipApp,
			handlers.userHomes,
			handlers,
			handlers.fileStore,
		),
		membership: membershippublicapi.NewHandler(handlers.membershipApp, handlers, handlers.tenantApp),
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
		catalog:    catalogpublicapi.NewHandler(handlers.catalogApp, handlers),
		tracking:   trackingpublicapi.NewHandler(handlers.trackingApp, handlers.catalogApp, handlers),
		governance: governancepublicapi.NewHandler(handlers.governanceApp, handlers),
		platform:   platformpublicapi.NewHandler(handlers.referenceApp, handlers),
		billing:    billingpublicapi.NewHandler(handlers.billingApp, handlers.invoiceApp, handlers),
		reports: reportspublicapi.NewHandler(
			handlers,
			handlers.reportsApp,
			handlers.catalogApp,
			handlers.membershipApp,
			handlers.trackingApp,
		),
	}
}
