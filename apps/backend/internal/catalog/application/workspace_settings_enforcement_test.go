package application_test

import (
	"context"
	"fmt"
	"testing"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"

	"github.com/samber/lo"
)

// ---------------------------------------------------------------------------
// Workspace settings enforcement tests (TDD RED phase)
//
// These tests verify that the catalog service layer enforces workspace-level
// policy settings. Today all settings are stored but never checked — a user
// who bypasses the frontend (e.g. direct API call) can ignore every policy.
//
// Each test seeds a workspace with a specific setting, then asserts the
// service rejects or adjusts the operation accordingly.
// ---------------------------------------------------------------------------

// --- OnlyAdminsMayCreateProjects -------------------------------------------

// TestOnlyAdminsMayCreateProjects_MemberDenied verifies that when the
// workspace setting only_admins_may_create_projects=true, a non-admin
// member calling CreateProject is rejected with ErrPermissionDenied.
//
// Security gap: without this enforcement, any workspace member can create
// projects via direct API call, bypassing the admin-only restriction that
// the workspace owner configured.
func TestOnlyAdminsMayCreateProjects_MemberDenied(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, adminUserID := seedCatalogWorkspaceAndUser(t, ctx, database)
	memberUserID := seedCatalogIdentityUser(t, ctx, database, 501, "member@example.com", "Member User")
	seedWorkspaceMember(t, ctx, database, workspaceID, memberUserID, "member")

	// Update workspace to restrict project creation to admins only.
	updateWorkspaceSettings(t, ctx, database, workspaceID, tenantdomain.WorkspaceSettingsInput{
		OnlyAdminsMayCreateProjects: true,
	})

	service := mustNewCatalogService(t, database)

	// Member should be denied.
	_, err := service.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   memberUserID,
		Name:        "Member Project",
	})
	if err == nil {
		t.Fatal("expected CreateProject to be denied for non-admin when only_admins_may_create_projects=true")
	}
	if err != catalogapplication.ErrPermissionDenied {
		t.Fatalf("expected ErrPermissionDenied, got %v", err)
	}

	// Admin should still be allowed.
	seedWorkspaceMember(t, ctx, database, workspaceID, adminUserID, "admin")
	_, err = service.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   adminUserID,
		Name:        "Admin Project",
	})
	if err != nil {
		t.Fatalf("expected admin to create project, got %v", err)
	}
}

// TestOnlyAdminsMayCreateProjects_SettingDisabled verifies that when
// only_admins_may_create_projects=false (default), any member can create
// projects. This is the regression guard for the default behavior.
func TestOnlyAdminsMayCreateProjects_SettingDisabled(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, _ := seedCatalogWorkspaceAndUser(t, ctx, database)
	memberUserID := seedCatalogIdentityUser(t, ctx, database, 502, "member2@example.com", "Member User 2")
	seedWorkspaceMember(t, ctx, database, workspaceID, memberUserID, "member")

	// Default settings — no restriction.
	service := mustNewCatalogService(t, database)

	_, err := service.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   memberUserID,
		Name:        "Member Project OK",
	})
	if err != nil {
		t.Fatalf("expected member to create project when setting is disabled, got %v", err)
	}
}

// --- OnlyAdminsMayCreateTags -----------------------------------------------

// TestOnlyAdminsMayCreateTags_MemberDenied verifies that when the workspace
// setting only_admins_may_create_tags=true, a non-admin member calling
// CreateTag is rejected with ErrPermissionDenied.
//
// Security gap: without this, any member can create arbitrary tags via
// direct API call, polluting the workspace tag namespace.
func TestOnlyAdminsMayCreateTags_MemberDenied(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, adminUserID := seedCatalogWorkspaceAndUser(t, ctx, database)
	memberUserID := seedCatalogIdentityUser(t, ctx, database, 503, "tag-member@example.com", "Tag Member")
	seedWorkspaceMember(t, ctx, database, workspaceID, memberUserID, "member")

	updateWorkspaceSettings(t, ctx, database, workspaceID, tenantdomain.WorkspaceSettingsInput{
		OnlyAdminsMayCreateTags: true,
	})

	service := mustNewCatalogService(t, database)

	// Member should be denied.
	_, err := service.CreateTag(ctx, catalogapplication.CreateTagCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   memberUserID,
		Name:        "Unauthorized Tag",
	})
	if err == nil {
		t.Fatal("expected CreateTag to be denied for non-admin when only_admins_may_create_tags=true")
	}
	if err != catalogapplication.ErrPermissionDenied {
		t.Fatalf("expected ErrPermissionDenied, got %v", err)
	}

	// Admin should still be allowed.
	seedWorkspaceMember(t, ctx, database, workspaceID, adminUserID, "admin")
	_, err = service.CreateTag(ctx, catalogapplication.CreateTagCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   adminUserID,
		Name:        "Admin Tag",
	})
	if err != nil {
		t.Fatalf("expected admin to create tag, got %v", err)
	}
}

// --- ProjectsEnforceBillable ----------------------------------------------

// TestProjectsEnforceBillable_RejectsNonBillable verifies that when the
// workspace setting projects_enforce_billable=true, creating a project with
// billable=false is rejected.
//
// Business rule: when enforced, all projects in the workspace must be
// billable — this prevents users from accidentally creating non-billable
// projects that would miss revenue tracking.
func TestProjectsEnforceBillable_RejectsNonBillable(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedCatalogWorkspaceAndUser(t, ctx, database)
	updateWorkspaceSettings(t, ctx, database, workspaceID, tenantdomain.WorkspaceSettingsInput{
		ProjectsEnforceBillable: true,
	})

	service := mustNewCatalogService(t, database)

	// Explicitly non-billable should be rejected.
	_, err := service.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Non-Billable Project",
		Billable:    lo.ToPtr(false),
	})
	if err == nil {
		t.Fatal("expected CreateProject with billable=false to be rejected when projects_enforce_billable=true")
	}
	if err != catalogapplication.ErrBillableEnforced {
		t.Fatalf("expected ErrBillableEnforced, got %v", err)
	}

	// Billable=true should succeed.
	_, err = service.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Billable Project",
		Billable:    lo.ToPtr(true),
	})
	if err != nil {
		t.Fatalf("expected billable project to be created, got %v", err)
	}
}

// TestProjectsEnforceBillable_UpdateRejectsNonBillable verifies that when
// projects_enforce_billable=true, updating an existing project to
// billable=false is rejected.
func TestProjectsEnforceBillable_UpdateRejectsNonBillable(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedCatalogWorkspaceAndUser(t, ctx, database)
	updateWorkspaceSettings(t, ctx, database, workspaceID, tenantdomain.WorkspaceSettingsInput{
		ProjectsEnforceBillable: true,
	})

	service := mustNewCatalogService(t, database)

	project, err := service.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Initially Billable",
		Billable:    lo.ToPtr(true),
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}

	// Attempt to set billable=false should be rejected.
	_, err = service.UpdateProject(ctx, catalogapplication.UpdateProjectCommand{
		WorkspaceID: workspaceID,
		ProjectID:   project.ID,
		Billable:    lo.ToPtr(false),
	})
	if err == nil {
		t.Fatal("expected UpdateProject with billable=false to be rejected when projects_enforce_billable=true")
	}
	if err != catalogapplication.ErrBillableEnforced {
		t.Fatalf("expected ErrBillableEnforced, got %v", err)
	}
}

// --- ProjectsBillableByDefault --------------------------------------------

// TestProjectsBillableByDefault_AppliedOnCreate verifies that when
// projects_billable_by_default=true and the caller does not specify
// billable, the created project defaults to billable=true.
//
// Without this, new projects default to billable=false even when the
// workspace admin configured billable-by-default, leading to missed
// revenue tracking.
func TestProjectsBillableByDefault_AppliedOnCreate(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedCatalogWorkspaceAndUser(t, ctx, database)
	updateWorkspaceSettings(t, ctx, database, workspaceID, tenantdomain.WorkspaceSettingsInput{
		ProjectsBillableByDefault: true,
	})

	service := mustNewCatalogService(t, database)

	// Create project without specifying billable — should default to true.
	project, err := service.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Default Billable Project",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	if !project.Billable {
		t.Fatal("expected project to default to billable=true when projects_billable_by_default=true")
	}
}

// --- ProjectsPrivateByDefault ---------------------------------------------

// TestProjectsPrivateByDefault_AppliedOnCreate verifies that when
// projects_private_by_default=true and the caller does not specify
// is_private, the created project defaults to private=true.
//
// Without this, new projects default to public even when the workspace
// admin configured private-by-default, potentially exposing project
// data to all workspace members.
func TestProjectsPrivateByDefault_AppliedOnCreate(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedCatalogWorkspaceAndUser(t, ctx, database)
	updateWorkspaceSettings(t, ctx, database, workspaceID, tenantdomain.WorkspaceSettingsInput{
		ProjectsPrivateByDefault: true,
	})

	service := mustNewCatalogService(t, database)

	// Create project without specifying is_private — should default to true.
	project, err := service.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Default Private Project",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	if !project.IsPrivate {
		t.Fatal("expected project to default to is_private=true when projects_private_by_default=true")
	}
}

// ---------------------------------------------------------------------------
// Test helpers for workspace settings enforcement tests
// ---------------------------------------------------------------------------

// seedWorkspaceMember inserts a workspace membership row for the given user
// with the given role. This gives the catalog service the data it needs to
// check whether a user is an admin or regular member.
func seedWorkspaceMember(
	t *testing.T,
	ctx context.Context,
	database *pgtest.Database,
	workspaceID int64,
	userID int64,
	role string,
) {
	t.Helper()

	// Use a unique email per user to avoid duplicate key on (workspace_id, lower(email)).
	email := fmt.Sprintf("user-%d@workspace-%d.test", userID, workspaceID)

	// Try insert first; if user already exists in workspace, update role.
	tag, err := database.Pool.Exec(ctx, `
		insert into membership_workspace_members (workspace_id, user_id, email, full_name, role, state)
		values ($1, $2, $3, '', $4, 'joined')
	`, workspaceID, userID, email, role)
	if err != nil {
		// If duplicate key on user_id, just update role.
		_, updateErr := database.Pool.Exec(ctx, `
			update membership_workspace_members
			set role = $3
			where workspace_id = $1 and user_id = $2
		`, workspaceID, userID, role)
		if updateErr != nil {
			t.Fatalf("seed workspace member: insert=%v update=%v", err, updateErr)
		}
		return
	}
	_ = tag
}

// updateWorkspaceSettings updates the workspace settings for the given
// workspace. This is the mechanism by which workspace admins configure
// enforcement policies.
func updateWorkspaceSettings(
	t *testing.T,
	ctx context.Context,
	database *pgtest.Database,
	workspaceID int64,
	input tenantdomain.WorkspaceSettingsInput,
) {
	t.Helper()

	settings, err := tenantdomain.NewWorkspaceSettings(input)
	if err != nil {
		t.Fatalf("build workspace settings: %v", err)
	}

	_, err = database.Pool.Exec(ctx, `
		update tenant_workspaces
		set only_admins_may_create_projects = $2,
		    only_admins_may_create_tags = $3,
		    projects_billable_by_default = $4,
		    projects_private_by_default = $5,
		    projects_enforce_billable = $6
		where id = $1
	`,
		workspaceID,
		settings.OnlyAdminsMayCreateProjects(),
		settings.OnlyAdminsMayCreateTags(),
		settings.ProjectsBillableByDefault(),
		settings.ProjectsPrivateByDefault(),
		settings.ProjectsEnforceBillable(),
	)
	if err != nil {
		t.Fatalf("update workspace settings: %v", err)
	}
}
