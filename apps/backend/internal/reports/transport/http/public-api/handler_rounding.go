package publicapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
	reportsapplication "opentoggl/backend/apps/backend/internal/reports/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
)

func (handler *Handler) applyRounding(ctx echo.Context, query *reportsapplication.Query, mode, minutes *int) error {
	workspace, err := handler.tenant.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(query.WorkspaceID))
	if err != nil {
		return err
	}
	rounding, err := reportsapplication.NewDurationRounding(
		lo.FromPtrOr(mode, int(workspace.Settings.Rounding())),
		lo.FromPtrOr(minutes, workspace.Settings.RoundingMinutes()),
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	query.Rounding = rounding
	return nil
}
