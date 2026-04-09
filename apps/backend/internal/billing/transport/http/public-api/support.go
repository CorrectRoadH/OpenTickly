package publicapi

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type ScopeAuthorizer interface {
	RequirePublicTrackOrganization(ctx echo.Context, organizationID int64) error
	RequirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error
	RequirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error)
}

func parsePathID(ctx echo.Context, key string) (int64, bool) {
	value, err := strconv.ParseInt(ctx.Param(key), 10, 64)
	if err != nil {
		return 0, false
	}
	return value, true
}

func planBody(planID int, name string) publictrackapi.BillingFancyPlan {
	monthly := 1
	pricingPlanID := planID
	priceZero := 0
	pricingPlans := []publictrackapi.BillingFancyPricingPlan{{
		ActualPriceInUsdCents: &priceZero,
		ListPriceInUsdCents:   &priceZero,
		Name:                  lo.ToPtr(name),
		Period:                &monthly,
		PricingPlanId:         &pricingPlanID,
	}}
	return publictrackapi.BillingFancyPlan{
		Name:         lo.ToPtr(name),
		PlanId:       &planID,
		PricingPlans: &pricingPlans,
	}
}

func usageCounterBody(name string, quotaRemaining int, quotaTotal int, resetsInSeconds int) publictrackapi.OrganizationUsageCounter {
	count := quotaTotal - quotaRemaining
	resetAt := time.Now().UTC().Add(time.Duration(resetsInSeconds) * time.Second).Format(time.RFC3339)
	return publictrackapi.OrganizationUsageCounter{
		Count:   &count,
		Limit:   &quotaTotal,
		Name:    lo.ToPtr(name),
		ResetAt: lo.ToPtr(resetAt),
	}
}

func writeBillingError(err error) error {
	if err == nil {
		return nil
	}
	return echo.NewHTTPError(http.StatusInternalServerError, err.Error()).SetInternal(err)
}

// Stubs for billing-related routes.

func (handler *Handler) GetPublicTrackOrganizationsPaymentsRecords(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	_ = ctx.Param("organization_id")
	return ctx.JSON(http.StatusOK, []any{})
}

func (handler *Handler) GetPublicTrackOrganizationInvoice(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	_ = ctx.Param("invoice_uid")
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) GetPublicTrackOrganizationInvoiceSummary(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}

	status, err := handler.billing.CommercialStatusForOrganization(ctx.Request().Context(), organizationID)
	if err != nil {
		return writeBillingError(err)
	}

	summary := fmt.Sprintf(
		`{"organization_id":%d,"customer_id":"%s","plan":"%s","state":"%s"}`,
		status.OrganizationID,
		status.CustomerID,
		status.Subscription.Plan,
		status.Subscription.State,
	)
	return ctx.JSON(http.StatusOK, summary)
}

func (handler *Handler) GetPublicTrackOrganizationPurchaseOrderPdf(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	_ = ctx.Param("purchase_order_uid")
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) DeletePublicTrackOrganizationSubscription(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) PostPublicTrackOrganizationSubscription(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) PutPublicTrackOrganizationSubscription(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) PostPublicTrackOrganizationSubscriptionCancellationFeedback(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) GetPublicTrackOrganizationSubscriptionPaymentFailed(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) PostPublicTrackOrganizationSubscriptionDiscountRequest(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) PostPublicTrackOrganizationSubscriptionCreateTrial(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) PostPublicTrackOrganizationSubscriptionUpgradeRequest(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	_ = ctx.Param("feature_id")
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) DeletePublicTrackOrganizationSubscriptionUsageBasedDiscount(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) PostPublicTrackOrganizationSubscriptionUsageBasedDiscount(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) DeletePublicTrackOrganizationTrial(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) CreatePublicTrackSetupIntent(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) GetPublicTrackUnifiedCustomer(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) PostPublicTrackUnifiedCustomer(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) PutPublicTrackUnifiedCustomer(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) DeletePublicTrackPromotionCode(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) PostPublicTrackPromotionCode(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (handler *Handler) GetPublicTrackFeatureUpsellMulti(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, []any{})
}
