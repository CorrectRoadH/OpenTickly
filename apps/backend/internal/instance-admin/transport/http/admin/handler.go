package admin

import (
	"errors"
	"net/http"
	"time"

	adminapi "opentoggl/backend/apps/backend/internal/http/generated/admin"
	"opentoggl/backend/apps/backend/internal/instance-admin/application"
	"opentoggl/backend/apps/backend/internal/instance-admin/domain"

	"github.com/labstack/echo/v4"
)

// sendTestEmailResponse is the JSON shape for the send-test-email endpoint.
type sendTestEmailResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// Handler implements adminapi.ServerInterface for the instance-admin module.
type Handler struct {
	service    *application.Service
	platform   HealthChecker
	updateFeed UpdateFeed
}

// HealthChecker provides dependency health probes for the admin health endpoint.
type HealthChecker interface {
	PingDatabase() (time.Duration, error)
	PingRedis() (time.Duration, error)
}

// NewHandler builds an admin handler. `updateFeed` may be nil when the
// operator has set OPENTOGGL_TELEMETRY=off — in that case the version endpoint
// falls back to returning only the compiled-in version with no update info.
func NewHandler(service *application.Service, platform HealthChecker, updateFeed UpdateFeed) *Handler {
	return &Handler{service: service, platform: platform, updateFeed: updateFeed}
}

func (h *Handler) GetBootstrapState(ctx echo.Context) error {
	state, err := h.service.GetBootstrapState(ctx.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return ctx.JSON(http.StatusOK, bootstrapStateResponse(state))
}

func (h *Handler) BootstrapInstanceAdmin(ctx echo.Context) error {
	var req adminapi.BootstrapRequest
	if err := ctx.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	state, err := h.service.Bootstrap(ctx.Request().Context(), application.BootstrapCommand{
		Email:    string(req.Email),
		Password: req.Password,
	})
	if errors.Is(err, domain.ErrBootstrapAlreadyCompleted) {
		return echo.NewHTTPError(http.StatusConflict, "Bootstrap already completed").SetInternal(err)
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return ctx.JSON(http.StatusCreated, bootstrapStateResponse(state))
}

func (h *Handler) GetRegistrationPolicy(ctx echo.Context) error {
	policy, err := h.service.GetRegistrationPolicy(ctx.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return ctx.JSON(http.StatusOK, registrationPolicyResponse(policy))
}

func (h *Handler) UpdateRegistrationPolicy(ctx echo.Context) error {
	var req adminapi.UpdateRegistrationPolicyRequest
	if err := ctx.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	policy, err := h.service.SetRegistrationPolicy(ctx.Request().Context(), string(req.Mode))
	if errors.Is(err, domain.ErrInvalidRegistrationMode) {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid registration mode").SetInternal(err)
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return ctx.JSON(http.StatusOK, registrationPolicyResponse(policy))
}

func (h *Handler) ListInstanceUsers(ctx echo.Context, params adminapi.ListInstanceUsersParams) error {
	filter := application.InstanceUserFilter{
		Status: "all",
		Page:   1,
		PerPage: 50,
	}
	if params.Status != nil {
		filter.Status = string(*params.Status)
	}
	if params.Query != nil {
		filter.Query = *params.Query
	}
	if params.Page != nil {
		filter.Page = *params.Page
	}
	if params.PerPage != nil {
		filter.PerPage = *params.PerPage
	}
	page, err := h.service.ListInstanceUsers(ctx.Request().Context(), filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return ctx.JSON(http.StatusOK, instanceUserListResponse(page))
}

func (h *Handler) DisableInstanceUser(ctx echo.Context, userId int64) error {
	err := h.service.DisableInstanceUser(ctx.Request().Context(), userId)
	if errors.Is(err, domain.ErrInstanceUserNotFound) {
		return echo.NewHTTPError(http.StatusNotFound, "User not found").SetInternal(err)
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return ctx.JSON(http.StatusOK, map[string]string{"status": "disabled"})
}

func (h *Handler) RestoreInstanceUser(ctx echo.Context, userId int64) error {
	err := h.service.RestoreInstanceUser(ctx.Request().Context(), userId)
	if errors.Is(err, domain.ErrInstanceUserNotFound) {
		return echo.NewHTTPError(http.StatusNotFound, "User not found").SetInternal(err)
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return ctx.JSON(http.StatusOK, map[string]string{"status": "active"})
}

func (h *Handler) GetInstanceHealth(ctx echo.Context) error {
	userCount, err := h.service.CountUsers(ctx.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	dbHealth := adminapi.DependencyHealth{Status: adminapi.Up}
	if latency, pingErr := h.platform.PingDatabase(); pingErr != nil {
		dbHealth.Status = adminapi.Down
	} else {
		ms := int(latency.Milliseconds())
		dbHealth.LatencyMs = &ms
	}

	redisHealth := adminapi.DependencyHealth{Status: adminapi.Up}
	if latency, pingErr := h.platform.PingRedis(); pingErr != nil {
		redisHealth.Status = adminapi.Down
	} else {
		ms := int(latency.Milliseconds())
		redisHealth.LatencyMs = &ms
	}

	overallStatus := adminapi.Healthy
	if dbHealth.Status == adminapi.Down || redisHealth.Status == adminapi.Down {
		overallStatus = adminapi.Unhealthy
	}

	return ctx.JSON(http.StatusOK, adminapi.InstanceHealth{
		Status:     overallStatus,
		Database:   dbHealth,
		Redis:      redisHealth,
		JobBacklog: 0,
		UserCount:  userCount,
		CheckedAt:  time.Now(),
	})
}

func (h *Handler) GetInstanceConfig(ctx echo.Context) error {
	cfg, err := h.service.GetInstanceConfig(ctx.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return ctx.JSON(http.StatusOK, instanceConfigResponse(cfg))
}

func (h *Handler) UpdateInstanceConfig(ctx echo.Context) error {
	var req adminapi.UpdateInstanceConfigRequest
	if err := ctx.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	update := application.InstanceConfigUpdate{
		SiteURL:                   req.SiteUrl,
		SenderEmail:               req.SenderEmail,
		SenderName:                req.SenderName,
		SMTPHost:                  req.SmtpHost,
		SMTPPort:                  req.SmtpPort,
		SMTPUsername:              req.SmtpUsername,
		SMTPPassword:              req.SmtpPassword,
		EmailVerificationRequired: req.EmailVerificationRequired,
	}
	if req.RegistrationMode != nil {
		mode := string(*req.RegistrationMode)
		update.RegistrationMode = &mode
	}
	cfg, err := h.service.UpdateInstanceConfig(ctx.Request().Context(), update)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return ctx.JSON(http.StatusOK, instanceConfigResponse(cfg))
}

func (h *Handler) ListOrganizations(ctx echo.Context) error {
	orgs, err := h.service.ListOrganizations(ctx.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	items := make([]adminapi.AdminOrganization, 0, len(orgs))
	for _, o := range orgs {
		items = append(items, adminapi.AdminOrganization{
			Id:             o.ID,
			MemberCount:    o.MemberCount,
			Name:           o.Name,
			WorkspaceCount: o.WorkspaceCount,
		})
	}
	return ctx.JSON(http.StatusOK, adminapi.OrganizationList{
		Organizations: items,
		TotalCount:    len(items),
	})
}

func (h *Handler) SendTestEmail(ctx echo.Context) error {
	var req struct {
		To string `json:"to"`
	}
	if err := ctx.Bind(&req); err != nil || req.To == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Email address required").SetInternal(err)
	}
	if err := h.service.SendTestEmail(ctx.Request().Context(), req.To); err != nil {
		return ctx.JSON(http.StatusOK, sendTestEmailResponse{
			Success: false,
			Message: err.Error(),
		})
	}
	return ctx.JSON(http.StatusOK, sendTestEmailResponse{
		Success: true,
		Message: "Test email sent to " + req.To,
	})
}

func (h *Handler) GetInstanceFeatureGate(ctx echo.Context, capabilityKey string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not implemented")
}

func instanceConfigResponse(cfg application.InstanceConfigView) adminapi.InstanceConfig {
	return adminapi.InstanceConfig{
		SiteUrl:                   cfg.SiteURL,
		SenderEmail:               cfg.SenderEmail,
		SenderName:                cfg.SenderName,
		SmtpConfigured:            cfg.SMTPConfigured,
		EmailVerificationRequired: cfg.EmailVerificationRequired,
		RegistrationMode:          adminapi.InstanceConfigRegistrationMode(cfg.RegistrationMode),
		UpdatedAt:                 cfg.UpdatedAt,
	}
}

func bootstrapStateResponse(state domain.BootstrapState) adminapi.BootstrapState {
	resp := adminapi.BootstrapState{
		Completed:   state.Completed,
		CompletedAt: state.CompletedAt,
	}
	if state.AdminEmail != "" {
		resp.AdminEmail = &state.AdminEmail
	}
	return resp
}

func registrationPolicyResponse(policy domain.RegistrationPolicy) adminapi.RegistrationPolicy {
	return adminapi.RegistrationPolicy{
		Mode:      adminapi.RegistrationPolicyMode(policy.Mode),
		UpdatedAt: policy.UpdatedAt,
	}
}

func instanceUserListResponse(page application.InstanceUserPage) adminapi.InstanceUserList {
	users := make([]adminapi.InstanceUser, 0, len(page.Users))
	for _, u := range page.Users {
		user := adminapi.InstanceUser{
			Id:              u.ID,
			Email:           u.Email,
			Status:          adminapi.InstanceUserStatus(u.Status),
			IsInstanceAdmin: u.IsInstanceAdmin,
			CreatedAt:       u.CreatedAt,
			LastActiveAt:    u.LastActiveAt,
		}
		if u.Name != "" {
			user.Name = &u.Name
		}
		users = append(users, user)
	}
	return adminapi.InstanceUserList{
		Users:      users,
		TotalCount: page.TotalCount,
		Page:       page.Page,
		PerPage:    page.PerPage,
	}
}
