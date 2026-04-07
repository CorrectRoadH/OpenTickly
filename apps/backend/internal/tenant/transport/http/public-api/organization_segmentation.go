package publicapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// segmentationResponse is the JSON shape for organization segmentation data.
type segmentationResponse struct {
	Segments []struct{} `json:"segments"`
}

// GetOrganizationSegmentation returns segmentation data for the organization.
func (handler *Handler) GetOrganizationSegmentation(ctx echo.Context) error {
	_, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, segmentationResponse{
		Segments: []struct{}{},
	})
}

// PutOrganizationSegmentation updates segmentation data for the organization.
func (handler *Handler) PutOrganizationSegmentation(ctx echo.Context) error {
	_, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, segmentationResponse{
		Segments: []struct{}{},
	})
}
