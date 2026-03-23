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
	tenantpublicapi "opentoggl/backend/apps/backend/internal/tenant/transport/http/public-api"
	trackingpublicapi "opentoggl/backend/apps/backend/internal/tracking/transport/http/public-api"
)

type publicTrackOpenAPIServer struct {
	*publicTrackUnimplementedServer
	identity    *identitypublicapi.PublicTrackHandler
	tenant      *tenantpublicapi.Handler
	membership  *membershippublicapi.Handler
	importing   *importingpublicapi.Handler
	catalog     *catalogpublicapi.Handler
	tracking    *trackingpublicapi.Handler
	governance  *governancepublicapi.Handler
	platform    *platformpublicapi.Handler
	billing     *billingpublicapi.Handler
}

func newPublicTrackOpenAPIServer(handlers *routeHandlers) publictrackapi.ServerInterface {
	return &publicTrackOpenAPIServer{
		publicTrackUnimplementedServer: &publicTrackUnimplementedServer{},
		identity:                       identitypublicapi.NewPublicTrackHandler(handlers.identityAPI, handlers.referenceApp),
		tenant: tenantpublicapi.NewHandler(
			handlers.tenantApp,
			handlers.billingApp,
			handlers.catalogApp,
			handlers.membershipApp,
			handlers.userHomes,
			handlers,
		),
		membership: membershippublicapi.NewHandler(handlers.membershipApp, handlers, handlers.tenantApp),
		importing:  importingpublicapi.NewHandler(handlers.importingApp, handlers),
		catalog:    catalogpublicapi.NewHandler(handlers.catalogApp, handlers),
		tracking:   trackingpublicapi.NewHandler(handlers.trackingApp, handlers),
		governance: governancepublicapi.NewHandler(handlers.governanceApp, handlers),
		platform:   platformpublicapi.NewHandler(handlers.referenceApp, handlers),
		billing:    billingpublicapi.NewHandler(handlers.billingApp, handlers),
	}
}
