package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

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

func (server *publicTrackOpenAPIServer) GetOrganizationsPaymentsRecords(ctx echo.Context, organizationId int, params publictrackapi.GetOrganizationsPaymentsRecordsParams) error {
	_ = organizationId
	_ = params
	return server.billing.GetPublicTrackOrganizationsPaymentsRecords(ctx)
}

func (server *publicTrackOpenAPIServer) GetOrganizationInvoice(ctx echo.Context, organizationId int, invoiceUid string) error {
	_ = organizationId
	_ = invoiceUid
	return server.billing.GetPublicTrackOrganizationInvoice(ctx)
}

func (server *publicTrackOpenAPIServer) GetOrganizationPurchaseOrderPdf(ctx echo.Context, organizationId int, purchaseOrderUid string) error {
	_ = organizationId
	_ = purchaseOrderUid
	return server.billing.GetPublicTrackOrganizationPurchaseOrderPdf(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteOrganizationSubscription(ctx echo.Context, organizationId int, params publictrackapi.DeleteOrganizationSubscriptionParams) error {
	_ = organizationId
	_ = params
	return server.billing.DeletePublicTrackOrganizationSubscription(ctx)
}

func (server *publicTrackOpenAPIServer) PostOrganizationSubscription(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.PostPublicTrackOrganizationSubscription(ctx)
}

func (server *publicTrackOpenAPIServer) PutOrganizationSubscription(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.PutPublicTrackOrganizationSubscription(ctx)
}

func (server *publicTrackOpenAPIServer) PostOrganizationSubscriptionCancellationFeedback(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.PostPublicTrackOrganizationSubscriptionCancellationFeedback(ctx)
}

func (server *publicTrackOpenAPIServer) GetOrganizationSubscriptionPaymentFailed(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.GetPublicTrackOrganizationSubscriptionPaymentFailed(ctx)
}

func (server *publicTrackOpenAPIServer) PostOrganizationSubscriptionDiscountRequest(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.PostPublicTrackOrganizationSubscriptionDiscountRequest(ctx)
}

func (server *publicTrackOpenAPIServer) PostOrganizationSubscriptionCreateTrial(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.PostPublicTrackOrganizationSubscriptionCreateTrial(ctx)
}

func (server *publicTrackOpenAPIServer) PostOrganizationSubscriptionUpgradeRequest(ctx echo.Context, organizationId int, featureId int) error {
	_ = organizationId
	_ = featureId
	return server.billing.PostPublicTrackOrganizationSubscriptionUpgradeRequest(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteOrganizationSubscriptionUsageBasedDiscount(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.DeletePublicTrackOrganizationSubscriptionUsageBasedDiscount(ctx)
}

func (server *publicTrackOpenAPIServer) PostOrganizationSubscriptionUsageBasedDiscount(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.PostPublicTrackOrganizationSubscriptionUsageBasedDiscount(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteOrganizationTrial(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.DeletePublicTrackOrganizationTrial(ctx)
}

func (server *publicTrackOpenAPIServer) CreateSetupIntent(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.CreatePublicTrackSetupIntent(ctx)
}

func (server *publicTrackOpenAPIServer) GetUnifiedCustomer(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.GetPublicTrackUnifiedCustomer(ctx)
}

func (server *publicTrackOpenAPIServer) PostUnifiedCustomer(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.PostPublicTrackUnifiedCustomer(ctx)
}

func (server *publicTrackOpenAPIServer) PutUnifiedCustomer(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.PutPublicTrackUnifiedCustomer(ctx)
}

func (server *publicTrackOpenAPIServer) DeletePromotionCode(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.DeletePublicTrackPromotionCode(ctx)
}

func (server *publicTrackOpenAPIServer) PostPromotionCode(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.PostPublicTrackPromotionCode(ctx)
}

func (server *publicTrackOpenAPIServer) GetFeatureUpsellMulti(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.billing.GetPublicTrackFeatureUpsellMulti(ctx)
}
