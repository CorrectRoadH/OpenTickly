package publicapi

import (
	"errors"
	"net/http"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackInvitation(ctx echo.Context, invitationCode string) error {
	invitation, err := handler.membership.GetOrganizationInvitation(ctx.Request().Context(), invitationCode)
	if err != nil {
		return writeInvitationError(err)
	}
	return ctx.JSON(http.StatusOK, publictrackapi.ModelsSSOInvitation{
		Code:             lo.ToPtr(invitation.Code),
		Email:            lo.ToPtr(invitation.Email),
		OrganizationId:   lo.ToPtr(int(invitation.OrganizationID)),
		OrganizationName: lo.ToPtr(invitation.OrganizationName),
		SenderEmail:      lo.ToPtr(invitation.SenderEmail),
		SenderName:       lo.ToPtr(invitation.SenderName),
		Sso:              lo.ToPtr(false),
		Token:            lo.ToPtr(invitation.Code),
	})
}

func (handler *Handler) PostPublicTrackOrganizationAcceptInvitation(ctx echo.Context, invitationCode string) error {
	if _, err := handler.membership.AcceptOrganizationInvitation(ctx.Request().Context(), invitationCode); err != nil {
		return writeInvitationError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (handler *Handler) PostPublicTrackRejectInvitation(ctx echo.Context, invitationCode string) error {
	if _, err := handler.membership.RejectOrganizationInvitation(ctx.Request().Context(), invitationCode); err != nil {
		return writeInvitationError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (handler *Handler) PostPublicTrackOrganizationInvitation(ctx echo.Context, organizationID int64) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}

	var payload publictrackapi.InvitationPost
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	organization, err := handler.organizations.GetOrganization(ctx.Request().Context(), tenantdomain.OrganizationID(organizationID))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	workspaces := make([]membershipapplication.InvitationWorkspaceAssignment, 0, len(lo.FromPtr(payload.Workspaces)))
	for _, workspace := range lo.FromPtr(payload.Workspaces) {
		if workspace.WorkspaceId == nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		workspaces = append(workspaces, membershipapplication.InvitationWorkspaceAssignment{
			WorkspaceID: int64(*workspace.WorkspaceId),
		})
	}

	invitations, err := handler.membership.CreateOrganizationInvitations(
		ctx.Request().Context(),
		membershipapplication.CreateOrganizationInvitationsCommand{
			OrganizationID:   organizationID,
			OrganizationName: organization.Name,
			SenderUserID:     user.ID,
			SenderName:       user.FullName,
			SenderEmail:      user.Email,
			Emails:           lo.FromPtr(payload.Emails),
			Workspaces:       workspaces,
		},
	)
	if err != nil {
		return writeInvitationError(err)
	}

	data := make([]publictrackapi.InvitationInfo, 0, len(invitations))
	compat := make([]publictrackapi.GithubComTogglTogglApiInternalModelsInvitation, 0, len(invitations))
	for _, invitation := range invitations {
		workspaceInfo := make([]publictrackapi.InvitationWorkspaceInfo, 0, len(invitation.Workspaces))
		for _, workspace := range invitation.Workspaces {
			var userID *int
			if workspace.UserID != nil {
				userID = lo.ToPtr(int(*workspace.UserID))
			}
			var workspaceUserID *int
			if workspace.WorkspaceUserID != nil {
				workspaceUserID = lo.ToPtr(int(*workspace.WorkspaceUserID))
			}
			workspaceInfo = append(workspaceInfo, publictrackapi.InvitationWorkspaceInfo{
				UserId:          userID,
				WorkspaceId:     lo.ToPtr(int(workspace.WorkspaceID)),
				WorkspaceUserId: workspaceUserID,
			})
		}
		data = append(data, publictrackapi.InvitationInfo{
			Email:          lo.ToPtr(invitation.Email),
			InvitationId:   lo.ToPtr(int(invitation.ID)),
			InviteUrl:      lo.ToPtr("/api/v9/invitations/" + invitation.Code),
			OrganizationId: lo.ToPtr(int(invitation.OrganizationID)),
			SenderId:       lo.ToPtr(int(invitation.SenderUserID)),
			Workspaces:     &workspaceInfo,
		})
		compat = append(compat, publictrackapi.GithubComTogglTogglApiInternalModelsInvitation{
			Code:             lo.ToPtr(invitation.Code),
			Email:            lo.ToPtr(invitation.Email),
			OrganizationId:   lo.ToPtr(int(invitation.OrganizationID)),
			OrganizationName: lo.ToPtr(invitation.OrganizationName),
			SenderEmail:      lo.ToPtr(invitation.SenderEmail),
			SenderName:       lo.ToPtr(invitation.SenderName),
		})
	}

	return ctx.JSON(http.StatusOK, publictrackapi.InvitationResult{
		Data:        &data,
		Invitations: &compat,
		Messages:    lo.ToPtr([]string{}),
	})
}

func (handler *Handler) PutPublicTrackInvitation(ctx echo.Context, organizationID int64, invitationID int64) error {
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}
	if _, err := handler.membership.ResendOrganizationInvitation(ctx.Request().Context(), organizationID, invitationID); err != nil {
		return writeInvitationError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func writeInvitationError(err error) error {
	switch {
	case errors.Is(err, membershipapplication.ErrInvitationNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "Not Found")
	case errors.Is(err, membershipapplication.ErrInvitationEmailsRequired),
		errors.Is(err, membershipapplication.ErrInvitationWorkspacesRequired),
		errors.Is(err, membershipapplication.ErrInvitationEmailInvalid),
		errors.Is(err, membershipapplication.ErrInvitationStateConflict):
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
}
