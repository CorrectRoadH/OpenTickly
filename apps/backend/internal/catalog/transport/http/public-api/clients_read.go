package publicapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackClients(ctx echo.Context) error {
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	workspaceIDs, err := handler.publicTrackWorkspaceIDs(ctx)
	if err != nil {
		return err
	}

	status, err := publicTrackClientStatus(ctx.QueryParam("status"))
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	filter := catalogapplication.ListClientsFilter{
		Name:   ctx.QueryParam("name"),
		Status: status,
	}

	clients := make([]publictrackapi.ModelsClient, 0)
	for _, workspaceID := range workspaceIDs {
		views, err := handler.catalog.ListClients(ctx.Request().Context(), workspaceID, filter)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
		for _, view := range views {
			clients = append(clients, clientViewToAPI(view))
		}
	}
	return ctx.JSON(http.StatusOK, clients)
}

func (handler *Handler) GetPublicTrackClientsData(ctx echo.Context) error {
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	workspaceIDs, err := handler.publicTrackWorkspaceIDs(ctx)
	if err != nil {
		return err
	}

	var request []int
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	clientIDs := intsToInt64s(request)
	clientsByID := make(map[int64]catalogapplication.ClientView)
	for _, workspaceID := range workspaceIDs {
		views, err := handler.catalog.ListClientsByIDs(ctx.Request().Context(), workspaceID, clientIDs)
		if err != nil {
			if errors.Is(err, catalogapplication.ErrClientNotFound) {
				// A client ID not belonging to this particular workspace is
				// expected when aggregating /me/clients/data across all user
				// workspaces — skip this workspace rather than failing the
				// whole request.
				continue
			}
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
		for _, view := range views {
			if _, exists := clientsByID[view.ID]; !exists {
				clientsByID[view.ID] = view
			}
		}
	}

	clients := make([]publictrackapi.ModelsClient, 0, len(clientIDs))
	for _, clientID := range clientIDs {
		clients = append(clients, clientViewToAPI(clientsByID[clientID]))
	}
	return ctx.JSON(http.StatusOK, clients)
}

func (handler *Handler) GetPublicTrackClient(ctx echo.Context) error {
	clientID, ok := parsePathID(ctx, "client_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	workspaceIDs, err := handler.publicTrackWorkspaceIDs(ctx)
	if err != nil {
		return err
	}

	for _, workspaceID := range workspaceIDs {
		view, err := handler.catalog.GetClient(ctx.Request().Context(), workspaceID, clientID)
		if err != nil {
			if errors.Is(err, catalogapplication.ErrClientNotFound) {
				continue
			}
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
		return ctx.JSON(http.StatusOK, clientViewToAPI(view))
	}
	return echo.NewHTTPError(http.StatusNotFound, "Not Found")
}

func clientViewToAPI(view catalogapplication.ClientView) publictrackapi.ModelsClient {
	return publictrackapi.ModelsClient{
		Archived:  lo.ToPtr(view.Archived),
		At:        timePointer(view.CreatedAt),
		CreatorId: intPointerFromInt64Pointer(view.CreatedBy),
		Id:        lo.ToPtr(int(view.ID)),
		Name:      lo.ToPtr(view.Name),
		Notes:     lo.ToPtr(view.Notes),
		Wid:       lo.ToPtr(int(view.WorkspaceID)),
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
