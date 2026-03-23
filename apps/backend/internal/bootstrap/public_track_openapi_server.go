package bootstrap

import (
	catalogpublicapi "opentoggl/backend/apps/backend/internal/catalog/transport/http/public-api"
	governancepublicapi "opentoggl/backend/apps/backend/internal/governance/transport/http/public-api"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identitypublicapi "opentoggl/backend/apps/backend/internal/identity/transport/http/public-api"
	membershippublicapi "opentoggl/backend/apps/backend/internal/membership/transport/http/public-api"
	tenantpublicapi "opentoggl/backend/apps/backend/internal/tenant/transport/http/public-api"
	trackingpublicapi "opentoggl/backend/apps/backend/internal/tracking/transport/http/public-api"
)

type publicTrackOpenAPIServer struct {
	*publicTrackUnimplementedServer
	identity   *identitypublicapi.PublicTrackHandler
	tenant     *tenantpublicapi.Handler
	membership *membershippublicapi.Handler
	catalog    *catalogpublicapi.Handler
	tracking   *trackingpublicapi.Handler
	governance *governancepublicapi.Handler
}

func newPublicTrackOpenAPIServer(handlers *routeHandlers) publictrackapi.ServerInterface {
	return &publicTrackOpenAPIServer{
		publicTrackUnimplementedServer: &publicTrackUnimplementedServer{},
		identity:                       identitypublicapi.NewPublicTrackHandler(handlers.identityAPI),
		tenant: tenantpublicapi.NewHandler(
			handlers.tenantApp,
			handlers.billingApp,
			handlers.catalogApp,
			handlers.membershipApp,
			handlers.userHomes,
			handlers,
		),
		membership: membershippublicapi.NewHandler(handlers.membershipApp, handlers),
		catalog:    catalogpublicapi.NewHandler(handlers.catalogApp, handlers),
		tracking:   trackingpublicapi.NewHandler(handlers.trackingApp, handlers),
		governance: governancepublicapi.NewHandler(handlers.governanceApp, handlers),
	}
}
