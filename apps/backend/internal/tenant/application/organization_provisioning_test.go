package application

import (
	"context"
	"errors"
	"testing"

	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	"opentoggl/backend/apps/backend/internal/log"
	"opentoggl/backend/apps/backend/internal/tenant/domain"
)

func TestCreateOrganizationDeletesTenantStateWhenCommercialProvisionFails(t *testing.T) {
	store := &stubStore{}
	commercial := &stubCommercialTruthSource{
		provisionErr: errors.New("provision failed"),
	}

	service, err := NewService(store, commercial, log.NopLogger())
	if err != nil {
		t.Fatalf("new tenant service: %v", err)
	}

	_, err = service.CreateOrganization(context.Background(), CreateOrganizationCommand{
		Name:          "Ops",
		WorkspaceName: "Ops Workspace",
	})
	if err == nil {
		t.Fatal("expected create organization to fail when billing provisioning fails")
	}

	if commercial.provisionedOrganizationID != 1 {
		t.Fatalf("expected billing provision to run for organization 1, got %d", commercial.provisionedOrganizationID)
	}
	if store.deletedOrganizationID != 1 {
		t.Fatalf("expected tenant organization cleanup to delete organization 1, got %d", store.deletedOrganizationID)
	}
}

type stubStore struct {
	deletedOrganizationID domain.OrganizationID
}

func (store *stubStore) CreateOrganization(
	ctx context.Context,
	name string,
	workspaceName string,
	settings domain.WorkspaceSettings,
) (domain.Organization, domain.Workspace, error) {
	organizationID, _ := domain.NewOrganizationID(1)
	workspaceID, _ := domain.NewWorkspaceID(1)
	organization, _ := domain.NewOrganization(organizationID, name)
	workspace, _ := domain.NewWorkspace(workspaceID, organizationID, workspaceName, settings)
	organization.AddWorkspace(workspace.ID())
	return organization, workspace, nil
}

func (store *stubStore) CreateWorkspace(
	ctx context.Context,
	organizationID domain.OrganizationID,
	name string,
	settings domain.WorkspaceSettings,
) (domain.Workspace, error) {
	panic("unexpected call")
}

func (store *stubStore) GetOrganization(ctx context.Context, organizationID domain.OrganizationID) (domain.Organization, bool, error) {
	panic("unexpected call")
}

func (store *stubStore) GetWorkspace(ctx context.Context, workspaceID domain.WorkspaceID) (domain.Workspace, bool, error) {
	panic("unexpected call")
}

func (store *stubStore) SaveOrganization(ctx context.Context, organization domain.Organization) error {
	panic("unexpected call")
}

func (store *stubStore) SaveWorkspace(ctx context.Context, workspace domain.Workspace) error {
	panic("unexpected call")
}

func (store *stubStore) DeleteWorkspace(ctx context.Context, workspaceID domain.WorkspaceID) error {
	panic("unexpected call")
}

func (store *stubStore) DeleteOrganization(ctx context.Context, organizationID domain.OrganizationID) error {
	store.deletedOrganizationID = organizationID
	return nil
}

func (store *stubStore) ListOrganizationsByUserID(ctx context.Context, userID int64) ([]domain.Organization, error) {
	panic("unexpected call")
}

func (store *stubStore) ListWorkspacesByUserID(ctx context.Context, userID int64) ([]domain.Workspace, error) {
	panic("unexpected call")
}

type stubCommercialTruthSource struct {
	provisionedOrganizationID int64
	provisionErr              error
}

func (source *stubCommercialTruthSource) CommercialStatusForOrganization(context.Context, int64) (CommercialSnapshot, error) {
	return billingdomain.CommercialStatus{}, nil
}

func (source *stubCommercialTruthSource) CommercialStatusForWorkspace(context.Context, int64) (CommercialSnapshot, error) {
	return billingdomain.CommercialStatus{}, nil
}

func (source *stubCommercialTruthSource) ProvisionDefaultOrganization(ctx context.Context, organizationID int64) error {
	source.provisionedOrganizationID = organizationID
	return source.provisionErr
}
