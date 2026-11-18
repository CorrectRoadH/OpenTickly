package publicapi

import (
	"net/http"

	"opentoggl/backend/apps/backend/internal/http/httperror"

	"github.com/labstack/echo/v5"
)

// PostOrganizationSlackIntegrationRequest submits a Slack integration request for the organization.
func (handler *Handler) PostOrganizationSlackIntegrationRequest(ctx *echo.Context) error {
	_, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}
	return httperror.New(http.StatusNotImplemented, "Not Implemented").WithCause(err)
}
