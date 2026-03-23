package publicapi

import (
	"net/http"
	"strconv"
	"time"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type ScopeAuthorizer interface {
	RequirePublicTrackOrganization(ctx echo.Context, organizationID int64) error
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
	return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
}
