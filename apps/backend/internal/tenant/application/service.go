package application

import (
	"context"
	"errors"
	"fmt"

	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	"opentoggl/backend/apps/backend/internal/tenant/domain"
)

var (
	ErrOrganizationNotFound          = errors.New("organization not found")
	ErrWorkspaceNotFound             = errors.New("workspace not found")
	ErrCommercialTruthSourceRequired = errors.New("tenant commercial truth source is required")
	ErrStoreRequired                 = errors.New("tenant store is required")
)

type CommercialSnapshot = billingdomain.CommercialStatus

type CommercialTruthSource interface {
	CommercialStatusForOrganization(context.Context, int64) (CommercialSnapshot, error)
	CommercialStatusForWorkspace(context.Context, int64) (CommercialSnapshot, error)
	ProvisionDefaultOrganization(context.Context, int64) error
}

type CreateOrganizationCommand struct {
	Name          string
	WorkspaceName string
}

type CreateOrganizationResult struct {
	OrganizationID domain.OrganizationID
	WorkspaceID    domain.WorkspaceID
}

type CreateWorkspaceCommand struct {
	OrganizationID domain.OrganizationID
	Name           string
	Settings       domain.WorkspaceSettingsInput
}

type CreateWorkspaceResult struct {
	WorkspaceID domain.WorkspaceID
}

type UpdateWorkspaceCommand struct {
	WorkspaceID domain.WorkspaceID
	Name        string
	Settings    domain.WorkspaceSettingsInput
}

type UpdateOrganizationCommand struct {
	OrganizationID domain.OrganizationID
	Name           string
}

type UpdateWorkspaceBrandingCommand struct {
	WorkspaceID      domain.WorkspaceID
	LogoStorageKey   string
	AvatarStorageKey string
	ClearLogo        bool
	ClearAvatar      bool
}

type OrganizationView struct {
	ID           domain.OrganizationID
	Name         string
	WorkspaceIDs []domain.WorkspaceID
	Commercial   CommercialSnapshot
}

type WorkspaceBrandingView struct {
	LogoStorageKey   string
	AvatarStorageKey string
}

type WorkspaceView struct {
	ID             domain.WorkspaceID
	OrganizationID domain.OrganizationID
	Name           string
	Settings       domain.WorkspaceSettings
	Branding       WorkspaceBrandingView
	Commercial     CommercialSnapshot
}

type Store interface {
	CreateOrganization(
		ctx context.Context,
		name string,
		workspaceName string,
		settings domain.WorkspaceSettings,
	) (domain.Organization, domain.Workspace, error)
	CreateWorkspace(
		ctx context.Context,
		organizationID domain.OrganizationID,
		name string,
		settings domain.WorkspaceSettings,
	) (domain.Workspace, error)
	GetOrganization(ctx context.Context, organizationID domain.OrganizationID) (domain.Organization, bool, error)
	GetWorkspace(ctx context.Context, workspaceID domain.WorkspaceID) (domain.Workspace, bool, error)
	SaveOrganization(ctx context.Context, organization domain.Organization) error
	SaveWorkspace(ctx context.Context, workspace domain.Workspace) error
	DeleteWorkspace(ctx context.Context, workspaceID domain.WorkspaceID) error
	DeleteOrganization(ctx context.Context, organizationID domain.OrganizationID) error
}

type Service struct {
	store      Store
	commercial CommercialTruthSource
}

func NewService(store Store, commercial CommercialTruthSource) (*Service, error) {
	if store == nil {
		return nil, ErrStoreRequired
	}
	if commercial == nil {
		// Tenant settings reads must always come from billing-owned commercial
		// truth instead of silently fabricating a local "free" status.
		return nil, ErrCommercialTruthSourceRequired
	}

	return &Service{
		store:      store,
		commercial: commercial,
	}, nil
}

func (service *Service) CreateOrganization(
	ctx context.Context,
	command CreateOrganizationCommand,
) (CreateOrganizationResult, error) {
	organization, workspace, err := service.store.CreateOrganization(
		ctx,
		command.Name,
		command.WorkspaceName,
		domain.DefaultWorkspaceSettings(),
	)
	if err != nil {
		return CreateOrganizationResult{}, err
	}
	if err := service.commercial.ProvisionDefaultOrganization(ctx, int64(organization.ID())); err != nil {
		if cleanupErr := service.store.DeleteOrganization(ctx, organization.ID()); cleanupErr != nil {
			return CreateOrganizationResult{}, fmt.Errorf(
				"provision default commercial account for organization %d: %w (cleanup failed: %v)",
				organization.ID(),
				err,
				cleanupErr,
			)
		}
		return CreateOrganizationResult{}, fmt.Errorf(
			"provision default commercial account for organization %d: %w",
			organization.ID(),
			err,
		)
	}

	return CreateOrganizationResult{
		OrganizationID: organization.ID(),
		WorkspaceID:    workspace.ID(),
	}, nil
}

func (service *Service) CreateWorkspace(
	ctx context.Context,
	command CreateWorkspaceCommand,
) (CreateWorkspaceResult, error) {
	settings, err := domain.NewWorkspaceSettings(command.Settings)
	if err != nil {
		return CreateWorkspaceResult{}, err
	}
	workspace, err := service.store.CreateWorkspace(ctx, command.OrganizationID, command.Name, settings)
	if err != nil {
		return CreateWorkspaceResult{}, err
	}

	return CreateWorkspaceResult{WorkspaceID: workspace.ID()}, nil
}

func (service *Service) GetOrganization(
	ctx context.Context,
	organizationID domain.OrganizationID,
) (OrganizationView, error) {
	organization, ok, err := service.store.GetOrganization(ctx, organizationID)
	if err != nil {
		return OrganizationView{}, err
	}
	if !ok {
		return OrganizationView{}, ErrOrganizationNotFound
	}

	commercial, err := service.commercial.CommercialStatusForOrganization(ctx, int64(organizationID))
	if err != nil {
		return OrganizationView{}, err
	}

	return OrganizationView{
		ID:           organization.ID(),
		Name:         organization.Name(),
		WorkspaceIDs: organization.WorkspaceIDs(),
		Commercial:   commercial,
	}, nil
}

func (service *Service) GetWorkspace(
	ctx context.Context,
	workspaceID domain.WorkspaceID,
) (WorkspaceView, error) {
	workspace, ok, err := service.store.GetWorkspace(ctx, workspaceID)
	if err != nil {
		return WorkspaceView{}, err
	}
	if !ok {
		return WorkspaceView{}, ErrWorkspaceNotFound
	}

	commercial, err := service.commercial.CommercialStatusForWorkspace(ctx, int64(workspaceID))
	if err != nil {
		return WorkspaceView{}, err
	}

	return WorkspaceView{
		ID:             workspace.ID(),
		OrganizationID: workspace.OrganizationID(),
		Name:           workspace.Name(),
		Settings:       workspace.Settings(),
		Branding:       toWorkspaceBrandingView(workspace.Branding()),
		Commercial:     commercial,
	}, nil
}

func (service *Service) UpdateWorkspace(ctx context.Context, command UpdateWorkspaceCommand) error {
	workspace, ok, err := service.store.GetWorkspace(ctx, command.WorkspaceID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrWorkspaceNotFound
	}

	settings, err := domain.NewWorkspaceSettings(command.Settings)
	if err != nil {
		return err
	}
	if err := workspace.Rename(command.Name); err != nil {
		return err
	}

	workspace.UpdateSettings(settings)
	return service.store.SaveWorkspace(ctx, workspace)
}

func (service *Service) UpdateOrganization(ctx context.Context, command UpdateOrganizationCommand) error {
	organization, ok, err := service.store.GetOrganization(ctx, command.OrganizationID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrOrganizationNotFound
	}
	if err := organization.Rename(command.Name); err != nil {
		return err
	}

	return service.store.SaveOrganization(ctx, organization)
}

func (service *Service) UpdateWorkspaceBranding(ctx context.Context, command UpdateWorkspaceBrandingCommand) error {
	workspace, ok, err := service.store.GetWorkspace(ctx, command.WorkspaceID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrWorkspaceNotFound
	}

	branding := workspace.Branding()
	if command.ClearLogo {
		branding = branding.WithoutAsset(domain.BrandingAssetKindLogo)
	}
	if command.ClearAvatar {
		branding = branding.WithoutAsset(domain.BrandingAssetKindAvatar)
	}
	if command.LogoStorageKey != "" {
		logo, err := domain.NewBrandingAsset(domain.BrandingAssetKindLogo, command.LogoStorageKey)
		if err != nil {
			return err
		}
		branding = branding.WithAsset(logo)
	}
	if command.AvatarStorageKey != "" {
		avatar, err := domain.NewBrandingAsset(domain.BrandingAssetKindAvatar, command.AvatarStorageKey)
		if err != nil {
			return err
		}
		branding = branding.WithAsset(avatar)
	}

	workspace.UpdateBranding(branding)
	return service.store.SaveWorkspace(ctx, workspace)
}

func (service *Service) DeleteWorkspace(ctx context.Context, workspaceID domain.WorkspaceID) error {
	if err := service.store.DeleteWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	return nil
}

func (service *Service) DeleteOrganization(ctx context.Context, organizationID domain.OrganizationID) error {
	if err := service.store.DeleteOrganization(ctx, organizationID); err != nil {
		return err
	}
	return nil
}

func toWorkspaceBrandingView(branding domain.WorkspaceBranding) WorkspaceBrandingView {
	// 商业字段必须走 billing truth，所以 tenant 只持久化品牌资源元数据，不在本地复制任何套餐状态。
	view := WorkspaceBrandingView{}
	if logo, ok := branding.Asset(domain.BrandingAssetKindLogo); ok {
		view.LogoStorageKey = logo.StorageKey()
	}
	if avatar, ok := branding.Asset(domain.BrandingAssetKindAvatar); ok {
		view.AvatarStorageKey = avatar.StorageKey()
	}
	return view
}
