package bootstrap

import (
	"net/http"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	identityweb "opentoggl/backend/apps/backend/internal/identity/transport/http/web"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"

	"github.com/labstack/echo/v4"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// getInvite exposes a public lookup endpoint for workspace invites so the
// accept page can render inviter + workspace context before the user
// authenticates. It never surfaces unrelated membership PII.
func (handlers *routeHandlers) getInvite(ctx echo.Context, token string) error {
	info, err := handlers.membershipApp.GetInviteByToken(ctx.Request().Context(), token)
	if err != nil {
		return writeMembershipError(err)
	}
	return ctx.JSON(http.StatusOK, inviteInfoBody(info))
}

// acceptInvite claims an invite with the currently authenticated session.
// The session user's email must match the invite's email; mismatches are
// surfaced as 400s so the UI can prompt the user to switch accounts.
func (handlers *routeHandlers) acceptInvite(ctx echo.Context, token string) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if err != nil {
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden").SetInternal(err)
	}

	accepted, err := handlers.membershipApp.ClaimInvite(ctx.Request().Context(), membershipapplication.AcceptInviteCommand{
		Token:     token,
		UserID:    user.ID,
		UserEmail: user.Email,
	})
	if err != nil {
		return writeMembershipError(err)
	}
	return ctx.JSON(http.StatusOK, acceptedInviteBody(accepted))
}

// acceptInviteSignup creates an account for the invite recipient, issues a
// session, then claims the invite in a single request. Account creation runs
// through the identity handler's pre-verified path so the email-verification
// flow is bypassed — presenting the invite token already proves the recipient
// owns the email it was sent to.
func (handlers *routeHandlers) acceptInviteSignup(ctx echo.Context, token string) error {
	var request webapi.WorkspaceInviteSignupRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	info, err := handlers.membershipApp.GetInviteByToken(ctx.Request().Context(), token)
	if err != nil {
		return writeMembershipError(err)
	}
	if info.Status != membershipapplication.InviteTokenStatusPending {
		switch info.Status {
		case membershipapplication.InviteTokenStatusExpired:
			return writeMembershipError(membershipapplication.ErrInviteTokenExpired)
		case membershipapplication.InviteTokenStatusConsumed:
			return writeMembershipError(membershipapplication.ErrInviteTokenAlreadyConsumed)
		default:
			return writeMembershipError(membershipapplication.ErrInviteTokenInvalid)
		}
	}

	timezone := ""
	if request.Timezone != nil {
		timezone = *request.Timezone
	}
	response := handlers.identity.RegisterPreVerified(ctx.Request().Context(), identityweb.RegisterRequest{
		Email:    info.Email,
		FullName: request.Fullname,
		Password: request.Password,
		Timezone: timezone,
	})
	if response.StatusCode >= http.StatusBadRequest {
		return identityHTTPError(response)
	}

	// After a successful registration the session user is resolvable via the
	// cookie we're about to set. Claim the invite on the new user's id.
	newUser, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), response.SessionID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	if _, err := handlers.membershipApp.ClaimInvite(ctx.Request().Context(), membershipapplication.AcceptInviteCommand{
		Token:     token,
		UserID:    newUser.ID,
		UserEmail: newUser.Email,
	}); err != nil {
		return writeMembershipError(err)
	}

	return handlers.writeIdentityResponse(ctx, response)
}

func inviteInfoBody(info membershipapplication.InviteTokenInfoView) webapi.WorkspaceInviteInfo {
	body := webapi.WorkspaceInviteInfo{
		Email:            openapi_types.Email(info.Email),
		InviterName:      info.InviterName,
		OrganizationId:   int(info.OrganizationID),
		OrganizationName: info.OrganizationName,
		Status:           string(info.Status),
		WorkspaceId:      int(info.WorkspaceID),
		WorkspaceName:    info.WorkspaceName,
	}
	if info.ExpiresAt != nil {
		expires := *info.ExpiresAt
		body.ExpiresAt = &expires
	}
	return body
}

func acceptedInviteBody(accepted membershipapplication.AcceptedInviteView) webapi.AcceptedWorkspaceInvite {
	return webapi.AcceptedWorkspaceInvite{
		OrganizationId:   int(accepted.OrganizationID),
		OrganizationName: accepted.OrganizationName,
		WorkspaceId:      int(accepted.WorkspaceID),
		WorkspaceName:    accepted.WorkspaceName,
	}
}
