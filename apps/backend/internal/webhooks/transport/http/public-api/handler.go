package publicapi

import (
	"net/http"

	publicwebhooksapi "opentoggl/backend/apps/backend/internal/http/generated/publicwebhooks"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/tracktime"
	webhooksapplication "opentoggl/backend/apps/backend/internal/webhooks/application"
	"opentoggl/backend/apps/backend/internal/webhooks/domain"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type ScopeAuthorizer interface {
	RequirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error)
	RequirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error
}

type Handler struct {
	scope    ScopeAuthorizer
	webhooks *webhooksapplication.Service
}

func NewHandler(scope ScopeAuthorizer, webhooks *webhooksapplication.Service) *Handler {
	return &Handler{scope: scope, webhooks: webhooks}
}

func (h *Handler) GetEventFilters(ctx echo.Context) error {
	filters := domain.SupportedEventFilters()
	return ctx.JSON(http.StatusOK, filters)
}

func (h *Handler) GetWorkspaceLimits(ctx echo.Context, workspaceID int) error {
	maxWebhooks, maxEvents := domain.DefaultLimits()
	return ctx.JSON(http.StatusOK, publicwebhooksapi.LimitsWorkspaceLimits{
		MaxWebhooks:         lo.ToPtr(maxWebhooks),
		MaxEventsPerWebhook: lo.ToPtr(maxEvents),
	})
}

func (h *Handler) GetStatus(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, publicwebhooksapi.StatusResponse{
		Status: lo.ToPtr("ok"),
	})
}

func (h *Handler) GetSubscriptions(ctx echo.Context, workspaceID int) error {
	user, err := h.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	_ = user

	if err := h.scope.RequirePublicTrackWorkspace(ctx, int64(workspaceID)); err != nil {
		return err
	}

	subs, err := h.webhooks.ListSubscriptions(ctx.Request().Context(), int64(workspaceID))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	result := make([]publicwebhooksapi.ModelsWebhookSubscription, 0, len(subs))
	for _, s := range subs {
		result = append(result, subscriptionToAPI(s))
	}
	return ctx.JSON(http.StatusOK, result)
}

func (h *Handler) PostSubscription(ctx echo.Context, workspaceID int) error {
	user, err := h.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := h.scope.RequirePublicTrackWorkspace(ctx, int64(workspaceID)); err != nil {
		return err
	}

	var body publicwebhooksapi.ModelsWebhookSubscription
	if err := ctx.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	cmd := webhooksapplication.CreateSubscriptionCommand{
		WorkspaceID:  int64(workspaceID),
		UserID:       user.ID,
		Description:  lo.FromPtrOr(body.Description, ""),
		URLCallback:  lo.FromPtrOr(body.UrlCallback, ""),
		Enabled:      lo.FromPtrOr(body.Enabled, false),
		EventFilters: eventFiltersFromAPI(body.EventFilters),
	}

	sub, err := h.webhooks.CreateSubscription(ctx.Request().Context(), cmd)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return ctx.JSON(http.StatusOK, subscriptionToAPI(sub))
}

func (h *Handler) UpdateSubscription(ctx echo.Context, workspaceID int, subscriptionID int) error {
	user, err := h.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := h.scope.RequirePublicTrackWorkspace(ctx, int64(workspaceID)); err != nil {
		return err
	}

	var body publicwebhooksapi.ModelsWebhookSubscription
	if err := ctx.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	cmd := webhooksapplication.UpdateSubscriptionCommand{
		WorkspaceID:    int64(workspaceID),
		SubscriptionID: int64(subscriptionID),
		UserID:         user.ID,
		Description:    lo.FromPtrOr(body.Description, ""),
		URLCallback:    lo.FromPtrOr(body.UrlCallback, ""),
		Enabled:        lo.FromPtrOr(body.Enabled, false),
		EventFilters:   eventFiltersFromAPI(body.EventFilters),
	}

	sub, err := h.webhooks.UpdateSubscription(ctx.Request().Context(), cmd)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return ctx.JSON(http.StatusOK, subscriptionToAPI(sub))
}

func (h *Handler) PatchSubscription(ctx echo.Context, workspaceID int, subscriptionID int) error {
	user, err := h.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := h.scope.RequirePublicTrackWorkspace(ctx, int64(workspaceID)); err != nil {
		return err
	}

	var body publicwebhooksapi.SubscriptionsState
	if err := ctx.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	sub, err := h.webhooks.PatchSubscription(
		ctx.Request().Context(),
		int64(workspaceID), int64(subscriptionID), user.ID,
		lo.FromPtrOr(body.Enabled, false),
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return ctx.JSON(http.StatusOK, subscriptionToAPI(sub))
}

func (h *Handler) DeleteSubscription(ctx echo.Context, workspaceID int, subscriptionID int) error {
	if _, err := h.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := h.scope.RequirePublicTrackWorkspace(ctx, int64(workspaceID)); err != nil {
		return err
	}

	sub, err := h.webhooks.DeleteSubscription(ctx.Request().Context(), int64(workspaceID), int64(subscriptionID))
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}
	return ctx.JSON(http.StatusOK, subscriptionToAPI(sub))
}

func (h *Handler) PostPing(ctx echo.Context, workspaceID int, subscriptionID int) error {
	if _, err := h.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := h.scope.RequirePublicTrackWorkspace(ctx, int64(workspaceID)); err != nil {
		return err
	}

	if err := h.webhooks.Ping(ctx.Request().Context(), int64(workspaceID), int64(subscriptionID)); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return ctx.JSON(http.StatusOK, publicwebhooksapi.PingResponse{
		Status: lo.ToPtr("ok"),
	})
}

func (h *Handler) GetValidate(ctx echo.Context, workspaceID int, subscriptionID int, validationCode string) error {
	_, err := h.webhooks.Validate(ctx.Request().Context(), int64(workspaceID), int64(subscriptionID), validationCode)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return ctx.String(http.StatusOK, "Subscription validated successfully")
}

// --- conversions ---

func subscriptionToAPI(s domain.Subscription) publicwebhooksapi.ModelsWebhookSubscription {
	result := publicwebhooksapi.ModelsWebhookSubscription{
		SubscriptionId:   lo.ToPtr(int(s.ID)),
		WorkspaceId:      lo.ToPtr(int(s.WorkspaceID)),
		UserId:           lo.ToPtr(int(s.UserID)),
		Description:      lo.ToPtr(s.Description),
		UrlCallback:      lo.ToPtr(s.URLCallback),
		Secret:           lo.ToPtr(s.Secret),
		Enabled:          lo.ToPtr(s.Enabled),
		HasPendingEvents: lo.ToPtr(false),
		CreatedAt:        tracktime.FormatUTCPtr(s.CreatedAt),
		UpdatedAt:        tracktime.FormatUTCPtr(s.UpdatedAt),
	}
	if s.ValidatedAt != nil {
		result.ValidatedAt = tracktime.FormatUTCFromPtr(s.ValidatedAt)
	}
	if s.DeletedAt != nil {
		result.DeletedAt = tracktime.FormatUTCFromPtr(s.DeletedAt)
	}
	filters := make([]publicwebhooksapi.ModelsWebhookSubscriptionEventFilter, 0, len(s.EventFilters))
	for _, f := range s.EventFilters {
		filters = append(filters, publicwebhooksapi.ModelsWebhookSubscriptionEventFilter{
			Entity: lo.ToPtr(f.Entity),
			Action: lo.ToPtr(f.Action),
		})
	}
	result.EventFilters = &filters
	return result
}

func eventFiltersFromAPI(filters *[]publicwebhooksapi.ModelsWebhookSubscriptionEventFilter) []domain.EventFilter {
	if filters == nil {
		return nil
	}
	result := make([]domain.EventFilter, 0, len(*filters))
	for _, f := range *filters {
		result = append(result, domain.EventFilter{
			Entity: lo.FromPtrOr(f.Entity, ""),
			Action: lo.FromPtrOr(f.Action, ""),
		})
	}
	return result
}
