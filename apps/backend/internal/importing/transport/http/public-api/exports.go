package publicapi

import (
	"errors"
	"net/http"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	importingapplication "opentoggl/backend/apps/backend/internal/importing/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type ScopeAuthorizer interface {
	RequirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error)
	RequirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error
}

type Handler struct {
	importing *importingapplication.Service
	scope     ScopeAuthorizer
}

func NewHandler(importing *importingapplication.Service, scope ScopeAuthorizer) *Handler {
	return &Handler{
		importing: importing,
		scope:     scope,
	}
}

func (handler *Handler) GetPublicTrackMeExport(ctx echo.Context) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	exports, err := handler.importing.ListUserExports(ctx.Request().Context(), user.ID)
	if err != nil {
		return writeImportingError(err)
	}
	return ctx.JSON(http.StatusOK, exportRecordsBody(exports))
}

func (handler *Handler) PostPublicTrackMeExport(ctx echo.Context) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	var payload publictrackapi.ExportPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	token, err := handler.importing.StartUserExport(ctx.Request().Context(), user.ID, importingapplication.UserExportSelection{
		Profile:  lo.FromPtr(payload.Profile),
		Timeline: lo.FromPtr(payload.Timeline),
	})
	if err != nil {
		return writeImportingError(err)
	}
	return ctx.JSON(http.StatusOK, token)
}

func (handler *Handler) GetPublicTrackMeExportArchive(ctx echo.Context, token string) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	archive, err := handler.importing.GetUserExportArchive(ctx.Request().Context(), user.ID, token)
	if err != nil {
		return writeImportingError(err)
	}
	ctx.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="`+archive.Filename+`"`)
	return ctx.Blob(http.StatusOK, "application/zip", archive.Content)
}

func (handler *Handler) GetPublicTrackWorkspaceExports(ctx echo.Context, workspaceID int64) error {
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	exports, err := handler.importing.ListWorkspaceExports(ctx.Request().Context(), workspaceID)
	if err != nil {
		return writeImportingError(err)
	}
	return ctx.JSON(http.StatusOK, exportRecordsBody(exports))
}

func (handler *Handler) PostPublicTrackWorkspaceExports(ctx echo.Context, workspaceID int64) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	var payload []string
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	token, err := handler.importing.StartWorkspaceExport(ctx.Request().Context(), workspaceID, user.ID, payload)
	if err != nil {
		return writeImportingError(err)
	}
	return ctx.JSON(http.StatusOK, token)
}

func (handler *Handler) GetPublicTrackWorkspaceExportArchive(
	ctx echo.Context,
	workspaceID int64,
	token string,
) error {
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	archive, err := handler.importing.GetWorkspaceExportArchive(ctx.Request().Context(), workspaceID, token)
	if err != nil {
		return writeImportingError(err)
	}
	ctx.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="`+archive.Filename+`"`)
	return ctx.Blob(http.StatusOK, "application/zip", archive.Content)
}

func exportRecordsBody(records []importingapplication.ExportRecordView) []publictrackapi.ModelsDownloadRequestRecord {
	response := make([]publictrackapi.ModelsDownloadRequestRecord, 0, len(records))
	for _, record := range records {
		response = append(response, publictrackapi.ModelsDownloadRequestRecord{
			ErrorMessage: optionalString(record.ErrorMessage),
			State:        lo.ToPtr(record.State),
			Token:        lo.ToPtr(record.Token),
		})
	}
	return response
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	return lo.ToPtr(value)
}

func writeImportingError(err error) error {
	switch {
	case errors.Is(err, importingapplication.ErrObjectsRequired),
		errors.Is(err, importingapplication.ErrInvalidScopeID):
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	case errors.Is(err, importingapplication.ErrExportNotFound):
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
}
