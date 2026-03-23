package bootstrap

import (
	"errors"
	"net/http"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (runtime *webRuntime) postPublicTrackClients(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	user, err := runtime.requirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ClientPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	view, err := runtime.catalogApp.CreateClient(ctx.Request().Context(), catalogapplication.CreateClientCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   user.ID,
		Name:        stringValue(request.Name),
	})
	if err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, clientViewToAPI(view))
}

func (runtime *webRuntime) putPublicTrackClient(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	clientID, ok := parsePathID(ctx, "client_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ClientPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	view, err := runtime.catalogApp.UpdateClient(ctx.Request().Context(), catalogapplication.UpdateClientCommand{
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

func (runtime *webRuntime) archivePublicTrackClients(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
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
		archivedProjectIDs, err := runtime.catalogApp.ArchiveClient(ctx.Request().Context(), workspaceID, clientID)
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

func (runtime *webRuntime) deletePublicTrackClients(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request []int
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	if err := runtime.catalogApp.DeleteClients(ctx.Request().Context(), workspaceID, intsToInt64s(request)); err != nil {
		if errors.Is(err, catalogapplication.ErrClientNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (runtime *webRuntime) deletePublicTrackClient(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	clientID, ok := parsePathID(ctx, "client_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := runtime.catalogApp.DeleteClients(ctx.Request().Context(), workspaceID, []int64{clientID}); err != nil {
		if errors.Is(err, catalogapplication.ErrClientNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, clientID)
}

func (runtime *webRuntime) archivePublicTrackClient(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	clientID, ok := parsePathID(ctx, "client_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	projectIDs, err := runtime.catalogApp.ArchiveClient(ctx.Request().Context(), workspaceID, clientID)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrClientNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
	return ctx.JSON(http.StatusOK, intsFromInt64s(projectIDs))
}

func (runtime *webRuntime) restorePublicTrackClient(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	clientID, ok := parsePathID(ctx, "client_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
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

	view, err := runtime.catalogApp.RestoreClient(ctx.Request().Context(), catalogapplication.RestoreClientCommand{
		WorkspaceID:        workspaceID,
		ClientID:           clientID,
		RestoreAllProjects: boolValue(request.RestoreAllProjects),
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
