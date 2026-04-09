package publicapi

import (
	"net/http"
	"strconv"
	"strings"

	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackOrganizationOwner(ctx echo.Context) error {
	organization, requester, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}

	for _, workspaceID := range organization.WorkspaceIDs {
		members, memberErr := handler.membership.ListWorkspaceMembers(ctx.Request().Context(), int64(workspaceID), requester.ID)
		if memberErr != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
		for _, member := range members {
			if member.UserID == nil || member.Role != membershipdomain.WorkspaceRoleAdmin {
				continue
			}
			return ctx.JSON(http.StatusOK, publictrackapi.GithubComTogglTogglApiInternalModelsOrganizationOwner{
				Email:          lo.ToPtr(member.Email),
				Id:             lo.ToPtr(int(*member.UserID)),
				Name:           lo.ToPtr(member.FullName),
				OrganizationId: lo.ToPtr(int(organization.ID)),
				UserId:         lo.ToPtr(int(*member.UserID)),
			})
		}
	}

	return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
}

func (handler *Handler) GetPublicTrackOrganizationRoles(ctx echo.Context) error {
	organization, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}

	roles := []publictrackapi.TypesRole{
		organizationRoleBody(int(organization.ID), 1, "owner", "Owner", "Organization owner", publictrackapi.Organization, publictrackapi.Owner, []string{"manage_organization", "manage_members"}),
		organizationRoleBody(int(organization.ID), 2, "admin", "Admin", "Organization administrator", publictrackapi.Organization, publictrackapi.Admin, []string{"manage_members"}),
		organizationRoleBody(int(organization.ID), 3, "member", "Member", "Workspace member", publictrackapi.Workspace, publictrackapi.Guest, []string{"view"}),
	}
	return ctx.JSON(http.StatusOK, roles)
}

func (handler *Handler) GetPublicTrackOrganizationSubscription(ctx echo.Context) error {
	organization, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}

	status := organization.Commercial.Subscription
	billingPeriod := 0
	switch status.Plan {
	case billingdomain.PlanStarter, billingdomain.PlanPremium, billingdomain.PlanEnterprise:
		billingPeriod = 1
	}

	seats := max(len(organization.WorkspaceIDs), 1)
	body := publictrackapi.SubscriptionOutData{
		ActiveUsers:           lo.ToPtr(len(organization.WorkspaceIDs)),
		AutoRenew:             lo.ToPtr(status.State == billingdomain.SubscriptionStateActive || status.State == billingdomain.SubscriptionStateTrialing),
		BillingPeriodInMonths: lo.ToPtr(billingPeriod),
		Currency:              lo.ToPtr("USD"),
		Enterprise:            lo.ToPtr(status.Plan == billingdomain.PlanEnterprise),
		IsUnified:             lo.ToPtr(true),
		PaymentFailed:         lo.ToPtr(false),
		PlanId:                lo.ToPtr(planID(status.Plan)),
		PlanName:              lo.ToPtr(titleCasePlan(status.Plan)),
		PricingPlanId:         lo.ToPtr(planID(status.Plan)),
		Seats:                 lo.ToPtr(seats),
		Site:                  lo.ToPtr("track"),
		State:                 lo.ToPtr(string(status.State)),
		TrialAvailable:        lo.ToPtr(status.State == billingdomain.SubscriptionStateFree),
	}
	return ctx.JSON(http.StatusOK, body)
}

func (handler *Handler) GetPublicTrackOrganizationWorkspacesStatistics(ctx echo.Context) error {
	organization, requester, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}

	response := make(map[string]publictrackapi.ModelsStatistics, len(organization.WorkspaceIDs))
	for _, workspaceID := range organization.WorkspaceIDs {
		members, memberErr := handler.membership.ListWorkspaceMembers(ctx.Request().Context(), int64(workspaceID), requester.ID)
		if memberErr != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
		groups, groupErr := handler.catalog.ListGroups(ctx.Request().Context(), int64(organization.ID))
		if groupErr != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}

		admins := make([]publictrackapi.ModelsUserData, 0)
		memberCount := 0
		for _, member := range members {
			if member.State == membershipdomain.WorkspaceMemberStateRemoved {
				continue
			}
			memberCount++
			if member.Role == membershipdomain.WorkspaceRoleAdmin {
				admins = append(admins, publictrackapi.ModelsUserData{
					Name:   lo.ToPtr(member.FullName),
					UserId: lo.ToPtr(int(memberUserID(member))),
				})
			}
		}

		response[strconv.FormatInt(int64(workspaceID), 10)] = publictrackapi.ModelsStatistics{
			Admins:       &admins,
			GroupsCount:  lo.ToPtr(len(groups)),
			MembersCount: lo.ToPtr(memberCount),
		}
	}
	return ctx.JSON(http.StatusOK, response)
}

func organizationRoleBody(
	organizationID int,
	roleID int,
	code string,
	name string,
	description string,
	entity publictrackapi.TypesRoleEntity,
	roleType publictrackapi.TypesRoleType,
	permissionNames []string,
) publictrackapi.TypesRole {
	permissions := make([]publictrackapi.TypesPermission, 0, len(permissionNames))
	for index, permissionName := range permissionNames {
		permissionID := index + 1
		permissions = append(permissions, publictrackapi.TypesPermission{
			Description:  lo.ToPtr(strings.ReplaceAll(permissionName, "_", " ")),
			Entity:       lo.ToPtr(publictrackapi.TypesPermissionEntity(entity)),
			Name:         lo.ToPtr(permissionName),
			PermissionId: lo.ToPtr(permissionID),
		})
	}

	return publictrackapi.TypesRole{
		Code:           lo.ToPtr(code),
		Description:    lo.ToPtr(description),
		Entity:         lo.ToPtr(entity),
		Name:           lo.ToPtr(name),
		OrganizationId: lo.ToPtr(organizationID),
		Permissions:    &permissions,
		PrivilegeLevel: lo.ToPtr(roleID),
		RoleId:         lo.ToPtr(roleID),
		Type:           lo.ToPtr(roleType),
	}
}

func planID(plan billingdomain.Plan) int {
	switch plan {
	case billingdomain.PlanFree:
		return 1
	case billingdomain.PlanStarter:
		return 2
	case billingdomain.PlanPremium:
		return 3
	case billingdomain.PlanEnterprise:
		return 4
	default:
		return 0
	}
}

func (handler *Handler) GetPublicTrackOwnershipTransfers(ctx echo.Context) error {
	organization, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}
	_ = organization.ID
	return ctx.JSON(http.StatusOK, []any{})
}

func (handler *Handler) PostPublicTrackOwnershipTransfer(ctx echo.Context) error {
	organization, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}
	_ = organization.ID
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented").SetInternal(err)
}

func (handler *Handler) GetPublicTrackOwnershipTransfer(ctx echo.Context) error {
	organization, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}
	_ = organization.ID
	_ = ctx.Param("transfer_id")
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented").SetInternal(err)
}

func (handler *Handler) PostPublicTrackOwnershipTransferActions(ctx echo.Context) error {
	organization, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}
	_ = organization.ID
	_ = ctx.Param("transfer_id")
	_ = ctx.Param("action")
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented").SetInternal(err)
}

func max(left int, right int) int {
	if left > right {
		return left
	}
	return right
}
