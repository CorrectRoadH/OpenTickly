package publicapi

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackWorkspaceLogo(ctx echo.Context) error {
	view, err := handler.loadPublicTrackWorkspaceForLogo(ctx)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, workspaceLogoBody(view))
}

func (handler *Handler) PostPublicTrackWorkspaceLogo(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	fileHeader, err := ctx.FormFile("file")
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	if err := handler.tenant.UpdateWorkspaceBranding(ctx.Request().Context(), tenantapplication.UpdateWorkspaceBrandingCommand{
		WorkspaceID:    tenantdomain.WorkspaceID(workspaceID),
		LogoStorageKey: workspaceLogoStorageKey(workspaceID, fileHeader.Filename),
	}); err != nil {
		return mapError(err)
	}
	return handler.GetPublicTrackWorkspaceLogo(ctx)
}

func (handler *Handler) DeletePublicTrackWorkspaceLogo(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := handler.tenant.UpdateWorkspaceBranding(ctx.Request().Context(), tenantapplication.UpdateWorkspaceBrandingCommand{
		WorkspaceID: tenantdomain.WorkspaceID(workspaceID),
		ClearLogo:   true,
	}); err != nil {
		return mapError(err)
	}
	return ctx.JSON(http.StatusOK, publictrackapi.ModelsLogo{Logo: lo.ToPtr("")})
}

func (handler *Handler) loadPublicTrackWorkspaceForLogo(ctx echo.Context) (tenantapplication.WorkspaceView, error) {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return tenantapplication.WorkspaceView{}, ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return tenantapplication.WorkspaceView{}, err
	}

	view, err := handler.tenant.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return tenantapplication.WorkspaceView{}, mapError(err)
	}
	return view, nil
}

func workspaceLogoBody(view tenantapplication.WorkspaceView) publictrackapi.ModelsLogo {
	return publictrackapi.ModelsLogo{
		Logo: lo.ToPtr(brandingURL(view.Branding.LogoStorageKey)),
	}
}

func workspaceLogoStorageKey(workspaceID int64, fileName string) string {
	extension := strings.ToLower(strings.TrimSpace(filepath.Ext(fileName)))
	return fmt.Sprintf("tenant/workspaces/%d/logo%s", workspaceID, extension)
}
