package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *publicTrackOpenAPIServer) GetClients(ctx echo.Context) error {
	return server.catalog.GetPublicTrackClients(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceClients(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceClientsParams,
) error {
	_ = workspaceId
	_ = params
	return server.catalog.GetPublicTrackClients(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceClients(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.catalog.PostPublicTrackClients(ctx)
}

func (server *publicTrackOpenAPIServer) ArchiveClients(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.catalog.ArchivePublicTrackClients(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceClientsData(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.catalog.GetPublicTrackClientsData(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteWorkspaceClients(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.catalog.DeletePublicTrackClients(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteWorkspaceClient(
	ctx echo.Context,
	workspaceId int,
	clientId int,
) error {
	_ = workspaceId
	_ = clientId
	return server.catalog.DeletePublicTrackClient(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceClient(
	ctx echo.Context,
	workspaceId int,
	clientId int,
) error {
	_ = workspaceId
	_ = clientId
	return server.catalog.GetPublicTrackClient(ctx)
}

func (server *publicTrackOpenAPIServer) PutWorkspaceClients(
	ctx echo.Context,
	workspaceId int,
	clientId int,
) error {
	_ = workspaceId
	_ = clientId
	return server.catalog.PutPublicTrackClient(ctx)
}

func (server *publicTrackOpenAPIServer) ArchiveClient(
	ctx echo.Context,
	workspaceId int,
	clientId int,
) error {
	_ = workspaceId
	_ = clientId
	return server.catalog.ArchivePublicTrackClient(ctx)
}

func (server *publicTrackOpenAPIServer) RestoreClient(
	ctx echo.Context,
	workspaceId int,
	clientId int,
) error {
	_ = workspaceId
	_ = clientId
	return server.catalog.RestorePublicTrackClient(ctx)
}
