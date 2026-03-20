package application

import (
	"context"
	"errors"
	"sync"

	billingdomain "opentoggl/backend/backend/internal/billing/domain"
	"opentoggl/backend/backend/internal/tenant/domain"
)

var (
	ErrOrganizationNotFound          = errors.New("organization not found")
	ErrWorkspaceNotFound             = errors.New("workspace not found")
	ErrCommercialTruthSourceRequired = errors.New("tenant commercial truth source is required")
)

type CommercialSnapshot = billingdomain.CommercialStatus

type CommercialTruthSource interface {
	CommercialStatusForOrganization(context.Context, int64) (CommercialSnapshot, error)
	CommercialStatusForWorkspace(context.Context, int64) (CommercialSnapshot, error)
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

type Service struct {
	store      *InMemoryStore
	commercial CommercialTruthSource
}

func NewService(store *InMemoryStore, commercial CommercialTruthSource) (*Service, error) {
	if store == nil {
		store = NewInMemoryStore()
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
	_ context.Context,
	command CreateOrganizationCommand,
) (CreateOrganizationResult, error) {
	service.store.mu.Lock()
	defer service.store.mu.Unlock()

	organizationID, err := domain.NewOrganizationID(service.store.nextOrganizationID)
	if err != nil {
		return CreateOrganizationResult{}, err
	}
	workspaceID, err := domain.NewWorkspaceID(service.store.nextWorkspaceID)
	if err != nil {
		return CreateOrganizationResult{}, err
	}

	organization, err := domain.NewOrganization(organizationID, command.Name)
	if err != nil {
		return CreateOrganizationResult{}, err
	}
	workspace, err := domain.NewWorkspace(
		workspaceID,
		organizationID,
		command.WorkspaceName,
		domain.DefaultWorkspaceSettings(),
	)
	if err != nil {
		return CreateOrganizationResult{}, err
	}

	organization.AddWorkspace(workspaceID)
	service.store.organizations[organizationID] = organization
	service.store.workspaces[workspaceID] = workspace
	service.store.nextOrganizationID++
	service.store.nextWorkspaceID++

	return CreateOrganizationResult{
		OrganizationID: organizationID,
		WorkspaceID:    workspaceID,
	}, nil
}

func (service *Service) CreateWorkspace(
	_ context.Context,
	command CreateWorkspaceCommand,
) (CreateWorkspaceResult, error) {
	service.store.mu.Lock()
	defer service.store.mu.Unlock()

	organization, ok := service.store.organizations[command.OrganizationID]
	if !ok {
		return CreateWorkspaceResult{}, ErrOrganizationNotFound
	}

	workspaceID, err := domain.NewWorkspaceID(service.store.nextWorkspaceID)
	if err != nil {
		return CreateWorkspaceResult{}, err
	}

	settings, err := domain.NewWorkspaceSettings(command.Settings)
	if err != nil {
		return CreateWorkspaceResult{}, err
	}
	workspace, err := domain.NewWorkspace(workspaceID, command.OrganizationID, command.Name, settings)
	if err != nil {
		return CreateWorkspaceResult{}, err
	}

	organization.AddWorkspace(workspaceID)
	service.store.organizations[command.OrganizationID] = organization
	service.store.workspaces[workspaceID] = workspace
	service.store.nextWorkspaceID++

	return CreateWorkspaceResult{WorkspaceID: workspaceID}, nil
}

func (service *Service) GetOrganization(
	ctx context.Context,
	organizationID domain.OrganizationID,
) (OrganizationView, error) {
	service.store.mu.RLock()
	organization, ok := service.store.organizations[organizationID]
	service.store.mu.RUnlock()
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
	service.store.mu.RLock()
	workspace, ok := service.store.workspaces[workspaceID]
	service.store.mu.RUnlock()
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

func (service *Service) UpdateWorkspace(
	_ context.Context,
	command UpdateWorkspaceCommand,
) error {
	service.store.mu.Lock()
	defer service.store.mu.Unlock()

	workspace, ok := service.store.workspaces[command.WorkspaceID]
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
	service.store.workspaces[command.WorkspaceID] = workspace
	return nil
}

func (service *Service) UpdateOrganization(
	_ context.Context,
	command UpdateOrganizationCommand,
) error {
	service.store.mu.Lock()
	defer service.store.mu.Unlock()

	organization, ok := service.store.organizations[command.OrganizationID]
	if !ok {
		return ErrOrganizationNotFound
	}
	if err := organization.Rename(command.Name); err != nil {
		return err
	}

	service.store.organizations[command.OrganizationID] = organization
	return nil
}

func (service *Service) UpdateWorkspaceBranding(
	_ context.Context,
	command UpdateWorkspaceBrandingCommand,
) error {
	service.store.mu.Lock()
	defer service.store.mu.Unlock()

	workspace, ok := service.store.workspaces[command.WorkspaceID]
	if !ok {
		return ErrWorkspaceNotFound
	}

	branding := workspace.Branding()
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
	service.store.workspaces[command.WorkspaceID] = workspace
	return nil
}

func (service *Service) DeleteWorkspace(_ context.Context, workspaceID domain.WorkspaceID) error {
	service.store.mu.Lock()
	defer service.store.mu.Unlock()

	workspace, ok := service.store.workspaces[workspaceID]
	if !ok {
		return ErrWorkspaceNotFound
	}

	organization := service.store.organizations[workspace.OrganizationID()]
	organization.RemoveWorkspace(workspaceID)
	service.store.organizations[workspace.OrganizationID()] = organization
	delete(service.store.workspaces, workspaceID)

	return nil
}

func (service *Service) DeleteOrganization(_ context.Context, organizationID domain.OrganizationID) error {
	service.store.mu.Lock()
	defer service.store.mu.Unlock()

	organization, ok := service.store.organizations[organizationID]
	if !ok {
		return ErrOrganizationNotFound
	}

	for _, workspaceID := range organization.WorkspaceIDs() {
		delete(service.store.workspaces, workspaceID)
	}
	delete(service.store.organizations, organizationID)
	return nil
}

type InMemoryStore struct {
	mu                 sync.RWMutex
	nextOrganizationID int64
	nextWorkspaceID    int64
	organizations      map[domain.OrganizationID]domain.Organization
	workspaces         map[domain.WorkspaceID]domain.Workspace
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		nextOrganizationID: 1,
		nextWorkspaceID:    1,
		organizations:      make(map[domain.OrganizationID]domain.Organization),
		workspaces:         make(map[domain.WorkspaceID]domain.Workspace),
	}
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
