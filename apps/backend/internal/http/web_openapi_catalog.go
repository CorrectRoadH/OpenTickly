package httpapp

import (
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"

	"github.com/labstack/echo/v4"
)

func (server *webOpenAPIServer) ListProjects(ctx echo.Context, params webapi.ListProjectsParams) error {
	request := ListProjectsRequest{
		WorkspaceID: int64PointerFromIntPointer(params.WorkspaceId),
	}
	if params.Status != nil {
		status := string(*params.Status)
		request.Status = &status
	}

	return writeWebResponse(
		ctx,
		server.handlers.Tenant.ListProjects(ctx.Request().Context(), sessionID(ctx), request),
	)
}

func (server *webOpenAPIServer) CreateProject(ctx echo.Context) error {
	var request webapi.ProjectCreateRequest
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	return writeWebResponse(
		ctx,
		server.handlers.Tenant.CreateProject(
			ctx.Request().Context(),
			sessionID(ctx),
			ProjectCreateRequest{
				WorkspaceID: int64(request.WorkspaceId),
				Name:        request.Name,
			},
		),
	)
}

func (server *webOpenAPIServer) GetProject(ctx echo.Context, projectId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.GetProject(ctx.Request().Context(), sessionID(ctx), int64(projectId)),
	)
}

func (server *webOpenAPIServer) ArchiveProject(ctx echo.Context, projectId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.ArchiveProject(ctx.Request().Context(), sessionID(ctx), int64(projectId)),
	)
}

func (server *webOpenAPIServer) RestoreProject(ctx echo.Context, projectId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.RestoreProject(ctx.Request().Context(), sessionID(ctx), int64(projectId)),
	)
}

func (server *webOpenAPIServer) PinProject(ctx echo.Context, projectId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.PinProject(ctx.Request().Context(), sessionID(ctx), int64(projectId)),
	)
}

func (server *webOpenAPIServer) UnpinProject(ctx echo.Context, projectId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.UnpinProject(ctx.Request().Context(), sessionID(ctx), int64(projectId)),
	)
}

func (server *webOpenAPIServer) ListProjectMembers(ctx echo.Context, projectId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.ListProjectMembers(ctx.Request().Context(), sessionID(ctx), int64(projectId)),
	)
}

func (server *webOpenAPIServer) GrantProjectMember(ctx echo.Context, projectId int) error {
	var request webapi.ProjectMemberGrantRequest
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	return writeWebResponse(
		ctx,
		server.handlers.Tenant.GrantProjectMember(
			ctx.Request().Context(),
			sessionID(ctx),
			int64(projectId),
			ProjectMemberGrantRequest{
				MemberID: int64(request.MemberId),
				Role:     request.Role,
			},
		),
	)
}

func (server *webOpenAPIServer) RevokeProjectMember(ctx echo.Context, projectId int, memberId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.RevokeProjectMember(
			ctx.Request().Context(),
			sessionID(ctx),
			int64(projectId),
			int64(memberId),
		),
	)
}

func (server *webOpenAPIServer) ListClients(ctx echo.Context, params webapi.ListClientsParams) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.ListClients(
			ctx.Request().Context(),
			sessionID(ctx),
			ListProjectsRequest{WorkspaceID: int64PointerFromIntPointer(params.WorkspaceId)},
		),
	)
}

func (server *webOpenAPIServer) CreateClient(ctx echo.Context) error {
	var request webapi.ClientCreateRequest
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	return writeWebResponse(
		ctx,
		server.handlers.Tenant.CreateClient(
			ctx.Request().Context(),
			sessionID(ctx),
			ClientCreateRequest{
				WorkspaceID: int64(request.WorkspaceId),
				Name:        request.Name,
			},
		),
	)
}

func (server *webOpenAPIServer) ListTasks(ctx echo.Context, params webapi.ListTasksParams) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.ListTasks(
			ctx.Request().Context(),
			sessionID(ctx),
			ListProjectsRequest{WorkspaceID: int64PointerFromIntPointer(params.WorkspaceId)},
		),
	)
}

func (server *webOpenAPIServer) CreateTask(ctx echo.Context) error {
	var request webapi.TaskCreateRequest
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	return writeWebResponse(
		ctx,
		server.handlers.Tenant.CreateTask(
			ctx.Request().Context(),
			sessionID(ctx),
			TaskCreateRequest{
				WorkspaceID: int64(request.WorkspaceId),
				Name:        request.Name,
			},
		),
	)
}

func (server *webOpenAPIServer) ListTags(ctx echo.Context, params webapi.ListTagsParams) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.ListTags(
			ctx.Request().Context(),
			sessionID(ctx),
			ListProjectsRequest{WorkspaceID: int64PointerFromIntPointer(params.WorkspaceId)},
		),
	)
}

func (server *webOpenAPIServer) CreateTag(ctx echo.Context) error {
	var request webapi.TagCreateRequest
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	return writeWebResponse(
		ctx,
		server.handlers.Tenant.CreateTag(
			ctx.Request().Context(),
			sessionID(ctx),
			TagCreateRequest{
				WorkspaceID: int64(request.WorkspaceId),
				Name:        request.Name,
			},
		),
	)
}

func (server *webOpenAPIServer) ListGroups(ctx echo.Context, params webapi.ListGroupsParams) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.ListGroups(
			ctx.Request().Context(),
			sessionID(ctx),
			ListProjectsRequest{WorkspaceID: int64PointerFromIntPointer(params.WorkspaceId)},
		),
	)
}

func (server *webOpenAPIServer) CreateGroup(ctx echo.Context) error {
	var request webapi.GroupCreateRequest
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	return writeWebResponse(
		ctx,
		server.handlers.Tenant.CreateGroup(
			ctx.Request().Context(),
			sessionID(ctx),
			GroupCreateRequest{
				WorkspaceID: int64(request.WorkspaceId),
				Name:        request.Name,
			},
		),
	)
}
