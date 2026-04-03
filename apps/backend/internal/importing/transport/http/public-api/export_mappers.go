package publicapi

import (
	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	importingapplication "opentoggl/backend/apps/backend/internal/importing/application"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"

	"github.com/samber/lo"
)

func clientViewToImported(v catalogapplication.ClientView) importingapplication.ImportedClient {
	return importingapplication.ImportedClient{
		ID:        v.ID,
		Name:      v.Name,
		WID:       v.WorkspaceID,
		Archived:  v.Archived,
		CreatorID: lo.FromPtr(v.CreatedBy),
	}
}

func projectViewToImported(v catalogapplication.ProjectView) importingapplication.ImportedProject {
	status := "active"
	if !v.Active {
		status = "inactive"
	}
	var startDate *string
	if v.StartDate != nil {
		s := v.StartDate.Format("2006-01-02")
		startDate = &s
	}
	return importingapplication.ImportedProject{
		ID:               v.ID,
		Name:             v.Name,
		WorkspaceID:      v.WorkspaceID,
		WID:              v.WorkspaceID,
		ClientID:         v.ClientID,
		CID:              v.ClientID,
		Active:           v.Active,
		Status:           status,
		Pinned:           v.Pinned,
		ActualSeconds:    v.ActualSeconds,
		Billable:         v.Billable,
		IsPrivate:        v.IsPrivate,
		Template:         v.Template,
		Recurring:        v.Recurring,
		Color:            lo.ToPtr(v.Color),
		Currency:         v.Currency,
		EstimatedSeconds: v.EstimatedSeconds,
		FixedFee:         v.FixedFee,
		Rate:             v.Rate,
		StartDate:        startDate,
	}
}

func tagViewToImported(v catalogapplication.TagView) importingapplication.ImportedTag {
	return importingapplication.ImportedTag{
		ID:          v.ID,
		Name:        v.Name,
		WorkspaceID: v.WorkspaceID,
		CreatorID:   lo.FromPtr(v.CreatedBy),
	}
}

func workspaceMemberViewToImported(v membershipapplication.WorkspaceMemberView) importingapplication.ImportedWorkspaceUser {
	active := v.State == "active"
	admin := v.Role == "admin" || v.Role == "owner"
	return importingapplication.ImportedWorkspaceUser{
		ID:       v.ID,
		UID:      lo.FromPtr(v.UserID),
		WID:      v.WorkspaceID,
		Name:     v.FullName,
		Email:    v.Email,
		Active:   active,
		Admin:    admin,
		Role:     string(v.Role),
		Timezone: "",
	}
}

func projectUserViewToImported(v catalogapplication.ProjectUserView) importingapplication.ImportedProjectUser {
	return importingapplication.ImportedProjectUser{
		ProjectID:   v.ProjectID,
		UserID:      v.UserID,
		WorkspaceID: v.WorkspaceID,
		Manager:     v.Role == "manager",
	}
}
