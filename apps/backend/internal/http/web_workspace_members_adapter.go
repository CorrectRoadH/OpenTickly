package httpapp

import "context"

type generatedWebWorkspaceMembersAdapter struct {
	handlers *WebHandlers
}

func newGeneratedWebWorkspaceMembersAdapter(
	handlers *WebHandlers,
) GeneratedWebWorkspaceMembersHandler {
	return &generatedWebWorkspaceMembersAdapter{handlers: handlers}
}

func (adapter *generatedWebWorkspaceMembersAdapter) ListWorkspaceMembers(
	ctx context.Context,
	session string,
	workspaceID int64,
) WebResponse {
	return adapter.handlers.Tenant.ListWorkspaceMembers(ctx, session, workspaceID)
}

func (adapter *generatedWebWorkspaceMembersAdapter) InviteWorkspaceMember(
	ctx context.Context,
	session string,
	workspaceID int64,
	request InviteWorkspaceMemberRequestBody,
) WebResponse {
	return adapter.handlers.Tenant.InviteWorkspaceMember(ctx, session, workspaceID, WorkspaceMemberInvitationRequest{
		Email: request.Email,
		Role:  request.Role,
	})
}
