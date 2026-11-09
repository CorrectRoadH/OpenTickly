package admin

import (
	"context"
	"errors"
	"net/http"
	"time"

	adminapi "opentoggl/backend/apps/backend/internal/http/generated/admin"
	"opentoggl/backend/apps/backend/internal/instance-admin/application"
	"opentoggl/backend/apps/backend/internal/instance-admin/domain"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (h *Handler) GetInstanceOidcConfig(ctx echo.Context) error {
	cfg, err := h.service.GetOIDCConfig(ctx.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return h.writeOIDCConfig(ctx, cfg)
}

func (h *Handler) UpdateInstanceOidcConfig(ctx echo.Context) error {
	var req adminapi.UpdateInstanceOidcConfigRequest
	if err := ctx.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	cfg, err := h.service.UpdateOIDCConfig(ctx.Request().Context(), application.OIDCConfigUpdate{
		Revision:            req.Revision,
		Enabled:             req.Enabled,
		ProviderName:        req.ProviderName,
		IssuerURL:           req.IssuerUrl,
		ClientID:            req.ClientId,
		ClientSecret:        req.ClientSecret,
		AllowedEmailDomains: req.AllowedEmailDomains,
		AutoProvision:       req.AutoProvision,
	})
	var validation *domain.OIDCValidationError
	switch {
	case errors.As(err, &validation):
		return echo.NewHTTPError(http.StatusBadRequest, validation.Error()).SetInternal(err)
	case errors.Is(err, domain.ErrOIDCConfigConflict):
		return echo.NewHTTPError(http.StatusConflict, "The single sign-on configuration was changed by someone else. Reload and try again.").SetInternal(err)
	case err != nil:
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return h.writeOIDCConfig(ctx, cfg)
}

// TestInstanceOidcConfig runs discovery and always answers 200 with the outcome
// in the payload, mirroring the SMTP test: reverse proxies replace 5xx bodies.
func (h *Handler) TestInstanceOidcConfig(ctx echo.Context) error {
	var req adminapi.OidcDiscoveryRequest
	if err := ctx.Bind(&req); err != nil || req.IssuerUrl == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Issuer URL required").SetInternal(err)
	}
	reqCtx, cancel := context.WithTimeout(ctx.Request().Context(), 10*time.Second)
	defer cancel()
	discovery, err := h.service.DiscoverOIDCProvider(reqCtx, req.IssuerUrl)
	var validation *domain.OIDCValidationError
	if errors.As(err, &validation) {
		return echo.NewHTTPError(http.StatusBadRequest, validation.Error()).SetInternal(err)
	}
	if err != nil {
		return ctx.JSON(http.StatusOK, adminapi.OidcDiscoveryResult{Ok: false, Message: err.Error()})
	}
	return ctx.JSON(http.StatusOK, adminapi.OidcDiscoveryResult{
		Ok:                    true,
		Message:               "Provider metadata found.",
		Issuer:                lo.ToPtr(discovery.Issuer),
		AuthorizationEndpoint: lo.ToPtr(discovery.AuthorizationEndpoint),
		TokenEndpoint:         lo.ToPtr(discovery.TokenEndpoint),
		JwksUri:               lo.ToPtr(discovery.JWKSURI),
	})
}

func (h *Handler) writeOIDCConfig(ctx echo.Context, cfg domain.OIDCConfig) error {
	instance, err := h.service.GetInstanceConfig(ctx.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return ctx.JSON(http.StatusOK, adminapi.InstanceOidcConfig{
		Revision:               cfg.Revision,
		Enabled:                cfg.Enabled,
		ProviderName:           cfg.ProviderName,
		IssuerUrl:              cfg.IssuerURL,
		ClientId:               cfg.ClientID,
		ClientSecretConfigured: cfg.ClientSecret != "",
		AllowedEmailDomains:    lo.Ternary(cfg.AllowedEmailDomains == nil, []string{}, cfg.AllowedEmailDomains),
		AutoProvision:          cfg.AutoProvision,
		RedirectUrl:            application.OIDCRedirectURL(instance.SiteURL),
		LoginUrl:               application.OIDCLoginPath,
		SiteUrlConfigured:      instance.SiteURL != "",
		UpdatedAt:              cfg.UpdatedAt,
	})
}
