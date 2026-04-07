package bootstrap

import (
	"net/http"

	tenantweb "opentoggl/backend/apps/backend/internal/tenant/transport/http/web"

	"github.com/labstack/echo/v4"
)

func (handlers *routeHandlers) workspaceCapabilities(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handlers.requireCurrentSessionWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	body, err := handlers.billingApp.WorkspaceCapabilitySnapshot(ctx.Request().Context(), workspaceID)
	if err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 404, Body: "Not Found"})
	}
	return ctx.JSON(http.StatusOK, tenantweb.CapabilitySnapshotToWeb(body))
}

func (handlers *routeHandlers) workspaceQuota(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handlers.requireCurrentSessionWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	body, headers, err := handlers.billingApp.WorkspaceQuotaSnapshot(ctx.Request().Context(), workspaceID)
	if err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 404, Body: "Not Found"})
	}
	for key, value := range headers {
		ctx.Response().Header().Set(key, value)
	}
	return ctx.JSON(http.StatusOK, tenantweb.QuotaWindowToWeb(body))
}
