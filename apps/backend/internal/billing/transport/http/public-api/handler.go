package publicapi

import (
	"net/http"
	"strings"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type Handler struct {
	billing *billingapplication.Service
}

func NewHandler(billing *billingapplication.Service) *Handler {
	return &Handler{billing: billing}
}

func (handler *Handler) GetPublicTrackPlans(ctx echo.Context) error {
	plans := make([]publictrackapi.ModelsPlanWithFeatures, 0, len(handler.billing.AvailablePlans()))
	for _, plan := range handler.billing.AvailablePlans() {
		features := make([]publictrackapi.GithubComTogglTogglApiInternalModelsPlanFeature, 0)
		for index, capability := range plan.Capabilities {
			if !capability.Enabled {
				continue
			}
			features = append(features, publictrackapi.GithubComTogglTogglApiInternalModelsPlanFeature{
				FeatureId:        lo.ToPtr(index + 1),
				IsDefaultFeature: lo.ToPtr(plan.Plan == billingdomain.PlanFree),
				Name:             lo.ToPtr(capability.Key),
				TrialOnly:        lo.ToPtr(false),
			})
		}

		plans = append(plans, publictrackapi.ModelsPlanWithFeatures{
			Features:      &features,
			Name:          lo.ToPtr(strings.ToUpper(string(plan.Plan[:1])) + string(plan.Plan[1:])),
			ProductHandle: lo.ToPtr(string(plan.Plan)),
		})
	}
	return ctx.JSON(http.StatusOK, plans)
}
