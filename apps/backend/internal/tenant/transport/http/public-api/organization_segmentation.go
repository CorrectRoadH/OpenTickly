package publicapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// GetOrganizationSegmentation returns segmentation data for the organization.
func (handler *Handler) GetOrganizationSegmentation(ctx echo.Context) error {
	_, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, map[string]any{
		"segments": []any{},
	})
}

// PutOrganizationSegmentation updates segmentation data for the organization.
func (handler *Handler) PutOrganizationSegmentation(ctx echo.Context) error {
	_, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, map[string]any{
		"segments": []any{},
	})
}
