package publicapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// PostOrganizationSlackIntegrationRequest submits a Slack integration request for the organization.
func (handler *Handler) PostOrganizationSlackIntegrationRequest(ctx echo.Context) error {
	_, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
