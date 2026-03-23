package bootstrap

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (runtime *webRuntime) getPublicTrackClients(ctx echo.Context) error {
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

	status, err := publicTrackClientStatus(ctx.QueryParam("status"))
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	views, err := runtime.catalogApp.ListClients(ctx.Request().Context(), workspaceID, catalogapplication.ListClientsFilter{
		Name:   ctx.QueryParam("name"),
		Status: status,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	clients := make([]publictrackapi.ModelsClient, 0, len(views))
	for _, view := range views {
		clients = append(clients, clientViewToAPI(view))
	}
	return ctx.JSON(http.StatusOK, clients)
}

func (runtime *webRuntime) getPublicTrackClientsData(ctx echo.Context) error {
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

	clientIDs := intsToInt64s(request)
	views, err := runtime.catalogApp.ListClientsByIDs(ctx.Request().Context(), workspaceID, clientIDs)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrClientNotFound) {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	clientsByID := make(map[int64]catalogapplication.ClientView, len(views))
	for _, view := range views {
		clientsByID[view.ID] = view
	}

	clients := make([]publictrackapi.ModelsClient, 0, len(clientIDs))
	for _, clientID := range clientIDs {
		clients = append(clients, clientViewToAPI(clientsByID[clientID]))
	}
	return ctx.JSON(http.StatusOK, clients)
}

func (runtime *webRuntime) getPublicTrackClient(ctx echo.Context) error {
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

	view, err := runtime.catalogApp.GetClient(ctx.Request().Context(), workspaceID, clientID)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrClientNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
	return ctx.JSON(http.StatusOK, clientViewToAPI(view))
}

func clientViewToAPI(view catalogapplication.ClientView) publictrackapi.ModelsClient {
	return publictrackapi.ModelsClient{
		Archived:  boolPointer(view.Archived),
		At:        timePointer(view.CreatedAt),
		CreatorId: intPointerFromInt64Pointer(view.CreatedBy),
		Id:        intPointer(view.ID),
		Name:      stringPointer(view.Name),
		Wid:       intPointer(view.WorkspaceID),
	}
}

func publicTrackClientStatus(value string) (catalogapplication.ClientStatus, error) {
	switch strings.TrimSpace(value) {
	case "":
		return catalogapplication.ClientStatusActive, nil
	case "both":
		return catalogapplication.ClientStatusBoth, nil
	case "active":
		return catalogapplication.ClientStatusActive, nil
	case "archived":
		return catalogapplication.ClientStatusArchived, nil
	default:
		return "", strconv.ErrSyntax
	}
}
