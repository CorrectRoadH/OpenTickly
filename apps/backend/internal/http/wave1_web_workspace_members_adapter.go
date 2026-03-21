package httpapp

import "context"

type generatedWave1WebWorkspaceMembersAdapter struct {
	handlers *Wave1WebHandlers
}

func newGeneratedWave1WebWorkspaceMembersAdapter(
	handlers *Wave1WebHandlers,
) GeneratedWave1WebWorkspaceMembersHandler {
	return &generatedWave1WebWorkspaceMembersAdapter{handlers: handlers}
}

func (adapter *generatedWave1WebWorkspaceMembersAdapter) ListWorkspaceMembers(
	ctx context.Context,
	session string,
	workspaceID int64,
) Wave1Response {
	return adapter.handlers.Tenant.ListWorkspaceMembers(ctx, session, workspaceID)
}

func (adapter *generatedWave1WebWorkspaceMembersAdapter) InviteWorkspaceMember(
	ctx context.Context,
	session string,
	workspaceID int64,
	request InviteWorkspaceMemberRequestBody,
) Wave1Response {
	return adapter.handlers.Tenant.InviteWorkspaceMember(ctx, session, workspaceID, WorkspaceMemberInvitationRequest{
		Email: request.Email,
		Role:  request.Role,
	})
}
