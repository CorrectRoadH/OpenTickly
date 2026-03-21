package httpapp

import "context"

type generatedWebProjectMembersAdapter struct {
	handlers *WebHandlers
}

func newGeneratedWebProjectMembersAdapter(
	handlers *WebHandlers,
) GeneratedWebProjectMembersHandler {
	return &generatedWebProjectMembersAdapter{handlers: handlers}
}

func (adapter *generatedWebProjectMembersAdapter) ListProjectMembers(
	ctx context.Context,
	session string,
	projectID int64,
) WebResponse {
	return adapter.handlers.Tenant.ListProjectMembers(ctx, session, projectID)
}

func (adapter *generatedWebProjectMembersAdapter) GrantProjectMember(
	ctx context.Context,
	session string,
	projectID int64,
	request GrantProjectMemberRequestBody,
) WebResponse {
	return adapter.handlers.Tenant.GrantProjectMember(ctx, session, projectID, ProjectMemberGrantRequest{
		MemberID: request.MemberID,
		Role:     request.Role,
	})
}

func (adapter *generatedWebProjectMembersAdapter) RevokeProjectMember(
	ctx context.Context,
	session string,
	projectID int64,
	memberID int64,
) WebResponse {
	return adapter.handlers.Tenant.RevokeProjectMember(ctx, session, projectID, memberID)
}
