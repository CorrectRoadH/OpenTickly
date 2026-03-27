package publicapi

import (
	"net/http"
	"strconv"
	"strings"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type Handler struct {
	billing  *billingapplication.Service
	invoices *billingapplication.InvoiceService
	scope    ScopeAuthorizer
}

func NewHandler(
	billing *billingapplication.Service,
	invoices *billingapplication.InvoiceService,
	scope ScopeAuthorizer,
) *Handler {
	return &Handler{billing: billing, invoices: invoices, scope: scope}
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

func (handler *Handler) GetPublicTrackOrganizationPlans(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}

	plans := make([]publictrackapi.BillingFancyPlan, 0, len(handler.billing.AvailablePlans()))
	for index, plan := range handler.billing.AvailablePlans() {
		name := strings.ToUpper(string(plan.Plan[:1])) + string(plan.Plan[1:])
		plans = append(plans, planBody(index+1, name))
	}
	return ctx.JSON(http.StatusOK, publictrackapi.BillingPricingStruct{
		Plans: &plans,
	})
}

func (handler *Handler) GetPublicTrackOrganizationPlan(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	planID, err := strconv.Atoi(ctx.Param("plan_id"))
	if err != nil || planID <= 0 {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	availablePlans := handler.billing.AvailablePlans()
	if planID > len(availablePlans) {
		return echo.NewHTTPError(http.StatusNotFound, "Not Found")
	}
	plan := availablePlans[planID-1]
	name := strings.ToUpper(string(plan.Plan[:1])) + string(plan.Plan[1:])
	plans := []publictrackapi.BillingFancyPlan{planBody(planID, name)}
	return ctx.JSON(http.StatusOK, publictrackapi.BillingPricingStruct{
		Plans: &plans,
	})
}

func (handler *Handler) GetPublicTrackOrganizationUsage(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}

	quota, _, err := handler.billing.OrganizationQuotaSnapshot(ctx.Request().Context(), organizationID)
	if err != nil {
		return writeBillingError(err)
	}
	response := []publictrackapi.OrganizationUsageCounter{
		usageCounterBody("workspace_quota", quota.Remaining, quota.Total, quota.ResetsInSeconds),
	}
	return ctx.JSON(http.StatusOK, response)
}
