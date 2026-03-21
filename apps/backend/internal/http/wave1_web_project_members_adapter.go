package httpapp

import "context"

type generatedWave1WebProjectMembersAdapter struct {
	handlers *Wave1WebHandlers
}

func newGeneratedWave1WebProjectMembersAdapter(
	handlers *Wave1WebHandlers,
) GeneratedWave1WebProjectMembersHandler {
	return &generatedWave1WebProjectMembersAdapter{handlers: handlers}
}

func (adapter *generatedWave1WebProjectMembersAdapter) ListProjectMembers(
	ctx context.Context,
	session string,
	projectID int64,
) Wave1Response {
	return adapter.handlers.Tenant.ListProjectMembers(ctx, session, projectID)
}

func (adapter *generatedWave1WebProjectMembersAdapter) GrantProjectMember(
	ctx context.Context,
	session string,
	projectID int64,
	request GrantProjectMemberRequestBody,
) Wave1Response {
	return adapter.handlers.Tenant.GrantProjectMember(ctx, session, projectID, ProjectMemberGrantRequest{
		MemberID: request.MemberID,
		Role:     request.Role,
	})
}

func (adapter *generatedWave1WebProjectMembersAdapter) RevokeProjectMember(
	ctx context.Context,
	session string,
	projectID int64,
	memberID int64,
) Wave1Response {
	return adapter.handlers.Tenant.RevokeProjectMember(ctx, session, projectID, memberID)
}
