package publicapi

import (
	"net/http"
	"slices"
	"strconv"
	"strings"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type organizationUserAggregate struct {
	UserID     int64
	Email      string
	Name       string
	Admin      bool
	Inactive   bool
	Joined     bool
	Workspaces []publictrackapi.ModelsOrgUserWorkspace
}

func (handler *Handler) GetPublicTrackOrganizationGroups(ctx echo.Context) error {
	organization, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}

	groups, groupErr := handler.catalog.ListGroups(ctx.Request().Context(), int64(organization.ID))
	if groupErr != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	response := make([]publictrackapi.GroupOrganizationGroupResponse, 0, len(groups))
	for _, group := range groups {
		response = append(response, handler.buildGroupResponse(ctx, group))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) GetPublicTrackOrganizationUsers(
	ctx echo.Context,
	params publictrackapi.GetOrganizationUsersParams,
) error {
	users, err := handler.organizationUsers(
		ctx,
		lo.FromPtr(params.Filter),
		lo.FromPtr(params.OnlyAdmins),
		lo.FromPtr(params.ActiveStatus),
		params.Page,
		params.PerPage,
		lo.FromPtr(params.SortDir),
	)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, users)
}

func (handler *Handler) GetPublicTrackOrganizationUsersDetailed(
	ctx echo.Context,
	params publictrackapi.GetOrganizationUsersDetailedParams,
) error {
	users, err := handler.organizationUsers(
		ctx,
		lo.FromPtr(params.Filter),
		lo.FromPtr(params.OnlyAdmins),
		lo.FromPtr(params.ActiveStatus),
		params.Page,
		params.PerPage,
		lo.FromPtr(params.SortDir),
	)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, users)
}

func (handler *Handler) organizationUsers(
	ctx echo.Context,
	filter string,
	onlyAdmins string,
	activeStatus string,
	page *int,
	perPage *int,
	sortDir string,
) ([]publictrackapi.ModelsOrgUser, error) {
	organization, requester, err := handler.organizationAggregate(ctx)
	if err != nil {
		return nil, err
	}

	aggregates := make(map[int64]*organizationUserAggregate)
	for _, workspaceID := range organization.WorkspaceIDs {
		workspace, workspaceErr := handler.tenant.GetWorkspace(ctx.Request().Context(), workspaceID)
		if workspaceErr != nil {
			return nil, mapError(workspaceErr)
		}

		members, memberErr := handler.membership.ListWorkspaceMembers(ctx.Request().Context(), int64(workspaceID), requester.ID)
		if memberErr != nil {
			return nil, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
		}

		for _, member := range members {
			if member.UserID == nil {
				continue
			}

			userID := *member.UserID
			item, ok := aggregates[userID]
			if !ok {
				item = &organizationUserAggregate{
					UserID:   userID,
					Email:    member.Email,
					Name:     member.FullName,
					Admin:    false,
					Inactive: true,
					Joined:   false,
				}
				aggregates[userID] = item
			}

			active := member.State == membershipdomain.WorkspaceMemberStateJoined || member.State == membershipdomain.WorkspaceMemberStateRestored
			admin := member.Role == membershipdomain.WorkspaceRoleAdmin
			item.Admin = item.Admin || admin
			item.Joined = item.Joined || active
			item.Inactive = item.Inactive && !active
			item.Workspaces = append(item.Workspaces, publictrackapi.ModelsOrgUserWorkspace{
				Active:                lo.ToPtr(active),
				Admin:                 lo.ToPtr(admin),
				DefaultCurrency:       lo.ToPtr(workspace.Settings.DefaultCurrency()),
				Groups:                lo.ToPtr([]publictrackapi.ModelsGroupDict{}),
				Inactive:              lo.ToPtr(!active),
				Rate:                  float32PointerFromFloat64(member.HourlyRate),
				Cost:                  float32PointerFromFloat64(member.LaborCost),
				Role:                  lo.ToPtr(string(member.Role)),
				RoleId:                organizationRoleID(member.Role),
				ViewEditBillableRates: lo.ToPtr(admin),
				ViewEditLaborCosts:    lo.ToPtr(admin),
				WorkspaceId:           lo.ToPtr(int(workspaceID)),
				WorkspaceName:         lo.ToPtr(workspace.Name),
				WorkspaceUserId:       lo.ToPtr(int(member.ID)),
			})
		}
	}

	list := make([]publictrackapi.ModelsOrgUser, 0, len(aggregates))
	for _, item := range aggregates {
		if !organizationUserMatches(item, filter, onlyAdmins, activeStatus) {
			continue
		}
		workspaces := slices.Clone(item.Workspaces)
		list = append(list, publictrackapi.ModelsOrgUser{
			N2faEnabled:  lo.ToPtr(false),
			Admin:        lo.ToPtr(item.Admin),
			CanEditEmail: lo.ToPtr(true),
			Email:        lo.ToPtr(item.Email),
			Groups:       lo.ToPtr([]publictrackapi.ModelsGroupDict{}),
			Id:           lo.ToPtr(int(item.UserID)),
			Inactive:     lo.ToPtr(item.Inactive),
			Joined:       lo.ToPtr(item.Joined),
			Name:         lo.ToPtr(item.Name),
			OrganizationId: lo.ToPtr(
				int(organization.ID),
			),
			Owner:          lo.ToPtr(item.UserID == requester.ID),
			RoleId:         lo.ToPtr(0),
			UserId:         lo.ToPtr(int(item.UserID)),
			WorkspaceCount: lo.ToPtr(len(workspaces)),
			Workspaces:     &workspaces,
		})
	}

	slices.SortFunc(list, func(left, right publictrackapi.ModelsOrgUser) int {
		leftName := strings.ToLower(lo.FromPtr(left.Name))
		rightName := strings.ToLower(lo.FromPtr(right.Name))
		if strings.EqualFold(sortDir, "desc") {
			return strings.Compare(rightName, leftName)
		}
		return strings.Compare(leftName, rightName)
	})

	start, end := paginateBounds(len(list), lo.FromPtrOr(page, 1), lo.FromPtrOr(perPage, 50))
	return list[start:end], nil
}

func (handler *Handler) organizationAggregate(
	ctx echo.Context,
) (tenantapplication.OrganizationView, *identityapplication.UserSnapshot, error) {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return tenantapplication.OrganizationView{}, nil, echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	requester, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return tenantapplication.OrganizationView{}, nil, err
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return tenantapplication.OrganizationView{}, nil, err
	}

	organization, err := handler.tenant.GetOrganization(ctx.Request().Context(), tenantdomain.OrganizationID(organizationID))
	if err != nil {
		return tenantapplication.OrganizationView{}, nil, mapError(err)
	}
	return organization, requester, nil
}

func organizationUserMatches(
	item *organizationUserAggregate,
	filter string,
	onlyAdmins string,
	activeStatus string,
) bool {
	needle := strings.ToLower(strings.TrimSpace(filter))
	if needle != "" && !strings.Contains(strings.ToLower(item.Name), needle) && !strings.Contains(strings.ToLower(item.Email), needle) {
		return false
	}

	if onlyAdmins != "" {
		wantAdmins, err := strconv.ParseBool(onlyAdmins)
		if err != nil || item.Admin != wantAdmins {
			return false
		}
	}

	if activeStatus != "" {
		allowed := make(map[string]struct{})
		for _, part := range strings.Split(activeStatus, ",") {
			allowed[strings.TrimSpace(part)] = struct{}{}
		}
		switch {
		case item.Joined:
			if _, ok := allowed["active"]; !ok {
				return false
			}
		case item.Inactive:
			if _, ok := allowed["inactive"]; !ok {
				return false
			}
		default:
			if _, ok := allowed["invited"]; !ok {
				return false
			}
		}
	}

	return true
}

func organizationRoleID(role membershipdomain.WorkspaceRole) *int {
	switch role {
	case membershipdomain.WorkspaceRoleAdmin:
		return lo.ToPtr(2)
	case membershipdomain.WorkspaceRoleMember:
		return lo.ToPtr(3)
	case membershipdomain.WorkspaceRoleProjectLead:
		return lo.ToPtr(4)
	case membershipdomain.WorkspaceRoleTeamLead:
		return lo.ToPtr(5)
	default:
		return nil
	}
}

func paginateBounds(total int, page int, perPage int) (int, int) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 50
	}
	start := (page - 1) * perPage
	if start > total {
		start = total
	}
	end := start + perPage
	if end > total {
		end = total
	}
	return start, end
}
