package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceClients(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceClientsParams,
) error {
	_ = workspaceId
	_ = params
	return server.runtime.getPublicTrackClients(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostWorkspaceClients(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.postPublicTrackClients(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) ArchiveClients(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.archivePublicTrackClients(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceClientsData(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.getPublicTrackClientsData(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) DeleteWorkspaceClients(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.deletePublicTrackClients(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) DeleteWorkspaceClient(
	ctx echo.Context,
	workspaceId int,
	clientId int,
) error {
	_ = workspaceId
	_ = clientId
	return server.runtime.deletePublicTrackClient(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceClient(
	ctx echo.Context,
	workspaceId int,
	clientId int,
) error {
	_ = workspaceId
	_ = clientId
	return server.runtime.getPublicTrackClient(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PutWorkspaceClients(
	ctx echo.Context,
	workspaceId int,
	clientId int,
) error {
	_ = workspaceId
	_ = clientId
	return server.runtime.putPublicTrackClient(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) ArchiveClient(
	ctx echo.Context,
	workspaceId int,
	clientId int,
) error {
	_ = workspaceId
	_ = clientId
	return server.runtime.archivePublicTrackClient(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) RestoreClient(
	ctx echo.Context,
	workspaceId int,
	clientId int,
) error {
	_ = workspaceId
	_ = clientId
	return server.runtime.restorePublicTrackClient(ctx)
}
