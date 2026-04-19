package publicapi

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"net/http"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	"opentoggl/backend/apps/backend/internal/platform/imageupload"
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
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "Invalid content type for image"})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "Invalid content type for image"})
	}
	defer file.Close()

	content, err := io.ReadAll(io.LimitReader(file, imageupload.MaxBytes+1))
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "Failed to read uploaded file"})
	}
	sniffedType, err := imageupload.DetectAllowedImage(content)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": err.Error()})
	}

	// Delete old logo blob if one exists.
	view, err := handler.tenant.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err == nil && view.Branding.LogoStorageKey != "" {
		_ = handler.files.Delete(ctx.Request().Context(), view.Branding.LogoStorageKey)
	}

	hash := sha256.Sum256(content)
	contentHash := hex.EncodeToString(hash[:8])
	storageKey := workspaceLogoStorageKey(workspaceID, contentHash, sniffedType)
	if err := handler.files.Put(ctx.Request().Context(), storageKey, sniffedType, content); err != nil {
		slog.Error("logo upload: failed to store file", "error", err, "key", storageKey)
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to store logo"})
	}

	if err := handler.tenant.UpdateWorkspaceBranding(ctx.Request().Context(), tenantapplication.UpdateWorkspaceBrandingCommand{
		WorkspaceID:    tenantdomain.WorkspaceID(workspaceID),
		LogoStorageKey: storageKey,
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

	// Delete old logo blob if one exists.
	view, err := handler.tenant.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err == nil && view.Branding.LogoStorageKey != "" {
		_ = handler.files.Delete(ctx.Request().Context(), view.Branding.LogoStorageKey)
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

func workspaceLogoStorageKey(workspaceID int64, contentHash string, sniffedContentType string) string {
	return fmt.Sprintf("tenant/workspaces/%d/%s%s", workspaceID, contentHash, imageupload.CanonicalExtension(sniffedContentType))
}
