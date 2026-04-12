package publicapi

import (
	"errors"
	"net/http"
	"strings"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	"opentoggl/backend/apps/backend/internal/tracktime"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) PostPublicTrackRate(ctx echo.Context) error {
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

	var request publictrackapi.RatesCreationRequest
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	level, err := publicTrackRateLevel(string(request.Level))
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	rateType, err := publicTrackRateType(lo.FromPtr(request.Type))
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	var start *time.Time
	if request.Start != nil {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(*request.Start))
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		start = &parsed
	}

	var mode *catalogapplication.RateChangeMode
	if request.Mode != nil {
		parsedMode, err := publicTrackRateMode(string(*request.Mode))
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		mode = &parsedMode
	}

	if _, err := handler.catalog.CreateRate(ctx.Request().Context(), catalogapplication.CreateRateCommand{
		WorkspaceID: workspaceID,
		CreatorID:   user.ID,
		Level:       level,
		LevelID:     int64(request.LevelId),
		Type:        rateType,
		Amount:      float64(lo.FromPtr(request.Amount)),
		Mode:        mode,
		Start:       start,
	}); err != nil {
		return writePublicTrackRateError(err)
	}

	return ctx.NoContent(http.StatusCreated)
}

func (handler *Handler) GetPublicTrackRatesByLevel(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	levelID, ok := parsePathID(ctx, "level_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	level, err := publicTrackRateLevel(ctx.Param("level"))
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	rateType, err := publicTrackRateType(ctx.QueryParam("type"))
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	views, err := handler.catalog.GetRatesByLevel(ctx.Request().Context(), workspaceID, level, levelID, rateType)
	if err != nil {
		return writePublicTrackRateError(err)
	}

	rates := make([]publictrackapi.ModelsRate, 0, len(views))
	for _, view := range views {
		rates = append(rates, rateViewToAPI(view))
	}
	return ctx.JSON(http.StatusOK, rates)
}

func rateViewToAPI(view catalogapplication.RateView) publictrackapi.ModelsRate {
	var amount *float32
	amount = lo.ToPtr(float32(view.Amount))

	return publictrackapi.ModelsRate{
		Amount:          amount,
		CreatedAt:       timePointer(view.CreatedAt),
		CreatorId:       intPointerFromInt64Pointer(view.CreatorID),
		End:             optionalTimePointer(view.End),
		Id:              lo.ToPtr(int(view.ID)),
		PlannedTaskId:   intPointerFromInt64Pointer(view.PlannedTaskID),
		ProjectId:       intPointerFromInt64Pointer(view.ProjectID),
		ProjectUserId:   intPointerFromInt64Pointer(view.ProjectUserID),
		RateChangeMode:  lo.ToPtr(publictrackapi.ModelsRateChangeMode(view.RateChangeMode)),
		Start:           timePointer(view.Start),
		Type:            lo.ToPtr(publictrackapi.ModelsRateType(view.Type)),
		UpdatedAt:       timePointer(view.UpdatedAt),
		WorkspaceId:     lo.ToPtr(int(view.WorkspaceID)),
		WorkspaceUserId: intPointerFromInt64Pointer(view.WorkspaceUserID),
	}
}

func publicTrackRateLevel(value string) (catalogapplication.RateLevel, error) {
	level := catalogapplication.RateLevel(strings.TrimSpace(value))
	if !catalogapplication.IsValidRateLevel(level) {
		return "", errors.New("invalid rate level")
	}
	return level, nil
}

func publicTrackRateType(value string) (catalogapplication.RateType, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return catalogapplication.RateTypeBillable, nil
	}
	rateType := catalogapplication.RateType(trimmed)
	if !catalogapplication.IsValidRateType(rateType) {
		return "", errors.New("invalid rate type")
	}
	return rateType, nil
}

func publicTrackRateMode(value string) (catalogapplication.RateChangeMode, error) {
	mode := catalogapplication.RateChangeMode(strings.TrimSpace(value))
	if !catalogapplication.IsValidRateChangeMode(mode) {
		return "", errors.New("invalid rate mode")
	}
	return mode, nil
}

func writePublicTrackRateError(err error) error {
	switch {
	case errors.Is(err, catalogapplication.ErrInvalidWorkspace),
		errors.Is(err, catalogapplication.ErrRateAmountInvalid),
		errors.Is(err, catalogapplication.ErrRateLevelInvalid),
		errors.Is(err, catalogapplication.ErrRateTypeInvalid),
		errors.Is(err, catalogapplication.ErrRateModeInvalid),
		errors.Is(err, catalogapplication.ErrRateTargetNotFound),
		errors.Is(err, catalogapplication.ErrRateStartOrModeRequired),
		errors.Is(err, catalogapplication.ErrProjectNotFound),
		errors.Is(err, catalogapplication.ErrProjectUserNotFound),
		errors.Is(err, catalogapplication.ErrTaskNotFound):
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error()).SetInternal(err)
	}
}

func optionalTimePointer(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.UTC().Format(tracktime.Layout)
	return &formatted
}
