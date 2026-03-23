package publicapi

import (
	"errors"
	"net/http"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) PostPublicTrackClients(ctx echo.Context) error {
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

	var request publictrackapi.ClientPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	view, err := handler.catalog.CreateClient(ctx.Request().Context(), catalogapplication.CreateClientCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   user.ID,
		Name:        lo.FromPtr(request.Name),
	})
	if err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, clientViewToAPI(view))
}

func (handler *Handler) PutPublicTrackClient(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	clientID, ok := parsePathID(ctx, "client_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ClientPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	view, err := handler.catalog.UpdateClient(ctx.Request().Context(), catalogapplication.UpdateClientCommand{
		WorkspaceID: workspaceID,
		ClientID:    clientID,
		Name:        request.Name,
	})
	if err != nil {
		if errors.Is(err, catalogapplication.ErrClientNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, clientViewToAPI(view))
}

func (handler *Handler) ArchivePublicTrackClients(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request []int
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if len(request) == 0 {
		return ctx.JSON(http.StatusOK, []publictrackapi.ClientsArchiveClientsResponse{})
	}

	projectIDs := make([]int64, 0)
	for _, clientID := range intsToInt64s(request) {
		archivedProjectIDs, err := handler.catalog.ArchiveClient(ctx.Request().Context(), workspaceID, clientID)
		if err != nil {
			if errors.Is(err, catalogapplication.ErrClientNotFound) {
				return echo.NewHTTPError(http.StatusNotFound, "Not Found")
			}
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
		}
		projectIDs = append(projectIDs, archivedProjectIDs...)
	}

	clientIDs := append([]int(nil), request...)
	archivedProjectIDs := intsFromInt64s(projectIDs)
	return ctx.JSON(http.StatusOK, []publictrackapi.ClientsArchiveClientsResponse{{
		ClientIds:  &clientIDs,
		ProjectIds: &archivedProjectIDs,
	}})
}

func (handler *Handler) DeletePublicTrackClients(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request []int
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	if err := handler.catalog.DeleteClients(ctx.Request().Context(), workspaceID, intsToInt64s(request)); err != nil {
		if errors.Is(err, catalogapplication.ErrClientNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (handler *Handler) DeletePublicTrackClient(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	clientID, ok := parsePathID(ctx, "client_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := handler.catalog.DeleteClients(ctx.Request().Context(), workspaceID, []int64{clientID}); err != nil {
		if errors.Is(err, catalogapplication.ErrClientNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, clientID)
}

func (handler *Handler) ArchivePublicTrackClient(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	clientID, ok := parsePathID(ctx, "client_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	projectIDs, err := handler.catalog.ArchiveClient(ctx.Request().Context(), workspaceID, clientID)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrClientNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
	return ctx.JSON(http.StatusOK, intsFromInt64s(projectIDs))
}

func (handler *Handler) RestorePublicTrackClient(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	clientID, ok := parsePathID(ctx, "client_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ProjectRestoreParams
	if err := bindPublicTrackJSON(ctx, &request, true); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	projectIDs := make([]int64, 0)
	if request.Projects != nil {
		projectIDs = intsToInt64s(*request.Projects)
	}

	view, err := handler.catalog.RestoreClient(ctx.Request().Context(), catalogapplication.RestoreClientCommand{
		WorkspaceID:        workspaceID,
		ClientID:           clientID,
		RestoreAllProjects: lo.FromPtr(request.RestoreAllProjects),
		ProjectIDs:         projectIDs,
	})
	if err != nil {
		switch {
		case errors.Is(err, catalogapplication.ErrClientNotFound):
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		case errors.Is(err, catalogapplication.ErrProjectNotFound):
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		default:
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
		}
	}
	return ctx.JSON(http.StatusOK, clientViewToAPI(view))
}
