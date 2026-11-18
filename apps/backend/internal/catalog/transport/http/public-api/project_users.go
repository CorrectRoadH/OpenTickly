package publicapi

import (
	"errors"
	"net/http"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	"opentoggl/backend/apps/backend/internal/http/httperror"

	"github.com/labstack/echo/v5"
	"github.com/samber/lo"
)

func (handler *Handler) PostPublicTrackProjectUser(ctx *echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.UserPostPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	canManageCosts, err := handler.catalog.CanManageLaborCosts(ctx.Request().Context(), workspaceID, user.ID)
	if err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}
	if request.LaborCost != nil && !canManageCosts {
		return echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
	}
	rates, err := projectUserRateChanges(workspaceID, user.ID, request.Rate, request.RateChangeMode, request.LaborCost, request.LaborCostChangeMode)
	if err != nil {
		return writePublicTrackRateError(err)
	}
	view, err := handler.catalog.CreateProjectUser(ctx.Request().Context(), catalogapplication.CreateProjectUserCommand{
		Rates:       rates,
		WorkspaceID: workspaceID,
		ProjectID:   int64Value(request.ProjectId),
		UserID:      int64Value(request.UserId),
		Manager:     lo.FromPtr(request.Manager),
	})
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return httperror.New(http.StatusNotFound, "Not Found").WithCause(err)
		}
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, projectUserViewToAPI(view, canManageCosts))
}

func (handler *Handler) PutPublicTrackProjectUser(ctx *echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectUserID, ok := parsePathID(ctx, "project_user_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, userID, ok := parseProjectUserID(projectUserID)
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.UserPutPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	canManageCosts, err := handler.catalog.CanManageLaborCosts(ctx.Request().Context(), workspaceID, user.ID)
	if err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}
	if request.LaborCost != nil && !canManageCosts {
		return echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
	}
	rates, err := projectUserRateChanges(workspaceID, user.ID, request.Rate, request.RateChangeMode, request.LaborCost, request.LaborCostChangeMode)
	if err != nil {
		return writePublicTrackRateError(err)
	}
	view, err := handler.catalog.UpdateProjectUser(ctx.Request().Context(), catalogapplication.UpdateProjectUserCommand{
		Rates:       rates,
		WorkspaceID: workspaceID,
		ProjectID:   projectID,
		UserID:      userID,
		Manager:     request.Manager,
	})
	if err != nil {
		switch {
		case errors.Is(err, catalogapplication.ErrProjectNotFound),
			errors.Is(err, catalogapplication.ErrProjectUserNotFound):
			return httperror.New(http.StatusNotFound, "Not Found").WithCause(err)
		default:
			return writePublicTrackCatalogError(ctx, err)
		}
	}

	return ctx.JSON(http.StatusOK, projectUserViewToAPI(view, canManageCosts))
}

func (handler *Handler) DeletePublicTrackProjectUser(ctx *echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectUserID, ok := parsePathID(ctx, "project_user_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, userID, ok := parseProjectUserID(projectUserID)
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := handler.catalog.DeleteProjectUser(ctx.Request().Context(), workspaceID, projectID, userID); err != nil {
		switch {
		case errors.Is(err, catalogapplication.ErrProjectNotFound),
			errors.Is(err, catalogapplication.ErrProjectUserNotFound):
			return httperror.New(http.StatusNotFound, "Not Found").WithCause(err)
		default:
			return writePublicTrackCatalogError(ctx, err)
		}
	}

	return ctx.JSON(http.StatusOK, int(projectUserID))
}

func parseProjectUserID(value int64) (projectID int64, userID int64, ok bool) {
	return catalogapplication.DecodeProjectUserID(value)
}

func projectUserRateChanges(workspaceID, actorID int64, rate *float32, rateMode *string, cost *float32, costMode *string) ([]catalogapplication.CreateRateCommand, error) {
	var changes []catalogapplication.CreateRateCommand
	for _, input := range []struct {
		amount *float32
		mode   *string
		kind   catalogapplication.RateType
	}{
		{rate, rateMode, catalogapplication.RateTypeBillable},
		{cost, costMode, catalogapplication.RateTypeLaborCost},
	} {
		change, err := projectRateChange(workspaceID, actorID, catalogapplication.RateLevelProjectUser, input.kind, input.amount, input.mode)
		if err != nil {
			return nil, err
		}
		if change != nil {
			changes = append(changes, *change)
		}
	}
	return changes, nil
}

func projectRateChange(workspaceID, actorID int64, level catalogapplication.RateLevel, kind catalogapplication.RateType, amount *float32, rawMode *string) (*catalogapplication.CreateRateCommand, error) {
	if amount == nil {
		return nil, nil
	}
	mode := catalogapplication.RateChangeModeOverrideAll
	if rawMode != nil {
		var err error
		mode, err = publicTrackRateMode(*rawMode)
		if err != nil {
			return nil, catalogapplication.ErrRateModeInvalid
		}
	}
	change, err := catalogapplication.PrepareRateChange(catalogapplication.CreateRateCommand{
		WorkspaceID: workspaceID, CreatorID: actorID, Level: level, Type: kind, Amount: float64(*amount), Mode: &mode,
	})
	if err != nil {
		return nil, err
	}
	return &change, nil
}
