package publicapi

import (
	"net/http"
	"strconv"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

// GetWorkspaceInvoices returns invoices for a workspace.
func (handler *Handler) GetWorkspaceInvoices(ctx echo.Context) error {
	workspaceID, err := strconv.ParseInt(ctx.Param("workspace_id"), 10, 64)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, []publictrackapi.ModelsUserInvoice{})
}

// PostWorkspaceUserInvoice creates a user invoice for a workspace.
func (handler *Handler) PostWorkspaceUserInvoice(ctx echo.Context) error {
	workspaceID, err := strconv.ParseInt(ctx.Param("workspace_id"), 10, 64)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	_ = workspaceID
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// GetWorkspaceInvoice returns a single invoice for a workspace.
func (handler *Handler) GetWorkspaceInvoice(ctx echo.Context) error {
	workspaceID, err := strconv.ParseInt(ctx.Param("workspace_id"), 10, 64)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	_ = workspaceID
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// DeleteWorkspaceInvoice deletes a workspace invoice.
func (handler *Handler) DeleteWorkspaceInvoice(ctx echo.Context) error {
	workspaceID, err := strconv.ParseInt(ctx.Param("workspace_id"), 10, 64)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	_ = workspaceID
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// GetWorkspacePurchaseOrderPdf returns a purchase order PDF for a workspace.
func (handler *Handler) GetWorkspacePurchaseOrderPdf(ctx echo.Context) error {
	workspaceID, err := strconv.ParseInt(ctx.Param("workspace_id"), 10, 64)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	_ = workspaceID
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// GetWorkspacePaymentReceipts returns payment receipts for a workspace.
func (handler *Handler) GetWorkspacePaymentReceipts(ctx echo.Context) error {
	workspaceID, err := strconv.ParseInt(ctx.Param("workspace_id"), 10, 64)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	_ = workspaceID
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
