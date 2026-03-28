package application

import (
	"context"
	"errors"
	"fmt"

	"opentoggl/backend/apps/backend/internal/instance-admin/domain"
)

// Service is the application service for instance administration.
type Service struct {
	bootstrap          BootstrapStore
	registrationPolicy RegistrationPolicyStore
	instanceUsers      InstanceUserStore
	instanceConfig     InstanceConfigStore
	orgLister          OrganizationLister
	userCreator        UserCreator
	emailSender        EmailSender
	clock              Clock
}

// Config holds dependencies for creating a Service.
type Config struct {
	Bootstrap          BootstrapStore
	RegistrationPolicy RegistrationPolicyStore
	InstanceUsers      InstanceUserStore
	InstanceConfig     InstanceConfigStore
	OrgLister          OrganizationLister
	UserCreator        UserCreator
	EmailSender        EmailSender
	Clock              Clock
}

func NewService(cfg Config) (*Service, error) {
	if cfg.Bootstrap == nil {
		return nil, errors.New("instance-admin: bootstrap store is required")
	}
	if cfg.RegistrationPolicy == nil {
		return nil, errors.New("instance-admin: registration policy store is required")
	}
	if cfg.InstanceUsers == nil {
		return nil, errors.New("instance-admin: instance users store is required")
	}
	if cfg.InstanceConfig == nil {
		return nil, errors.New("instance-admin: instance config store is required")
	}
	if cfg.OrgLister == nil {
		return nil, errors.New("instance-admin: organization lister is required")
	}
	if cfg.UserCreator == nil {
		return nil, errors.New("instance-admin: user creator is required")
	}
	if cfg.EmailSender == nil {
		return nil, errors.New("instance-admin: email sender is required")
	}
	if cfg.Clock == nil {
		return nil, errors.New("instance-admin: clock is required")
	}
	return &Service{
		bootstrap:          cfg.Bootstrap,
		registrationPolicy: cfg.RegistrationPolicy,
		instanceUsers:      cfg.InstanceUsers,
		instanceConfig:     cfg.InstanceConfig,
		orgLister:          cfg.OrgLister,
		userCreator:        cfg.UserCreator,
		emailSender:        cfg.EmailSender,
		clock:              cfg.Clock,
	}, nil
}

// GetBootstrapState returns the current bootstrap state.
func (s *Service) GetBootstrapState(ctx context.Context) (domain.BootstrapState, error) {
	return s.bootstrap.GetBootstrapState(ctx)
}

// BootstrapCommand is the input for the bootstrap use case.
type BootstrapCommand struct {
	Email    string
	Password string
}

// Bootstrap creates the first instance administrator.
// It registers a real user account, marks it as instance admin,
// records bootstrap completion, and sets registration policy to closed.
// Returns ErrBootstrapAlreadyCompleted if already done.
func (s *Service) Bootstrap(ctx context.Context, cmd BootstrapCommand) (domain.BootstrapState, error) {
	state, err := s.bootstrap.GetBootstrapState(ctx)
	if err != nil {
		return domain.BootstrapState{}, fmt.Errorf("instance-admin bootstrap: %w", err)
	}
	now := s.clock.Now()
	if err := state.Complete(cmd.Email, now); err != nil {
		return domain.BootstrapState{}, err
	}

	userID, err := s.userCreator.CreateUser(ctx, cmd.Email, cmd.Password, "Instance Admin")
	if err != nil {
		return domain.BootstrapState{}, fmt.Errorf("instance-admin bootstrap create user: %w", err)
	}
	if err := s.userCreator.MarkInstanceAdmin(ctx, userID); err != nil {
		return domain.BootstrapState{}, fmt.Errorf("instance-admin bootstrap mark admin: %w", err)
	}

	if err := s.bootstrap.CompleteBootstrap(ctx, cmd.Email, now); err != nil {
		return domain.BootstrapState{}, fmt.Errorf("instance-admin bootstrap: %w", err)
	}

	if err := s.registrationPolicy.SetRegistrationPolicy(ctx, domain.RegistrationModeClosed, now); err != nil {
		return domain.BootstrapState{}, fmt.Errorf("instance-admin bootstrap set policy: %w", err)
	}

	return state, nil
}

// GetRegistrationPolicy returns the current registration policy.
func (s *Service) GetRegistrationPolicy(ctx context.Context) (domain.RegistrationPolicy, error) {
	return s.registrationPolicy.GetRegistrationPolicy(ctx)
}

// SetRegistrationPolicy updates the instance registration mode.
func (s *Service) SetRegistrationPolicy(ctx context.Context, modeStr string) (domain.RegistrationPolicy, error) {
	mode, err := domain.ParseRegistrationMode(modeStr)
	if err != nil {
		return domain.RegistrationPolicy{}, err
	}
	now := s.clock.Now()
	if err := s.registrationPolicy.SetRegistrationPolicy(ctx, mode, now); err != nil {
		return domain.RegistrationPolicy{}, fmt.Errorf("instance-admin registration policy: %w", err)
	}
	return domain.RegistrationPolicy{Mode: mode, UpdatedAt: now}, nil
}

// ListInstanceUsers returns a paginated list of instance users.
func (s *Service) ListInstanceUsers(ctx context.Context, filter InstanceUserFilter) (InstanceUserPage, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PerPage < 1 || filter.PerPage > 100 {
		filter.PerPage = 50
	}
	return s.instanceUsers.ListUsers(ctx, filter)
}

// DisableInstanceUser disables a user at the instance level.
func (s *Service) DisableInstanceUser(ctx context.Context, userID int64) error {
	return s.instanceUsers.DisableUser(ctx, userID)
}

// RestoreInstanceUser restores a disabled user.
func (s *Service) RestoreInstanceUser(ctx context.Context, userID int64) error {
	return s.instanceUsers.RestoreUser(ctx, userID)
}

// CountUsers returns the total user count for health/stats.
func (s *Service) CountUsers(ctx context.Context) (int, error) {
	return s.instanceUsers.CountUsers(ctx)
}

// GetInstanceConfig returns the current instance configuration.
func (s *Service) GetInstanceConfig(ctx context.Context) (InstanceConfigView, error) {
	cfg, err := s.instanceConfig.GetConfig(ctx)
	if err != nil {
		return InstanceConfigView{}, fmt.Errorf("instance-admin get config: %w", err)
	}
	policy, err := s.registrationPolicy.GetRegistrationPolicy(ctx)
	if err != nil {
		return InstanceConfigView{}, fmt.Errorf("instance-admin get config policy: %w", err)
	}
	cfg.RegistrationMode = string(policy.Mode)
	return cfg, nil
}

// UpdateInstanceConfig updates instance configuration fields.
func (s *Service) UpdateInstanceConfig(ctx context.Context, update InstanceConfigUpdate) (InstanceConfigView, error) {
	if update.RegistrationMode != nil {
		mode, err := domain.ParseRegistrationMode(*update.RegistrationMode)
		if err != nil {
			return InstanceConfigView{}, err
		}
		now := s.clock.Now()
		if err := s.registrationPolicy.SetRegistrationPolicy(ctx, mode, now); err != nil {
			return InstanceConfigView{}, fmt.Errorf("instance-admin update config policy: %w", err)
		}
	}
	cfg, err := s.instanceConfig.UpdateConfig(ctx, update)
	if err != nil {
		return InstanceConfigView{}, fmt.Errorf("instance-admin update config: %w", err)
	}
	policy, err := s.registrationPolicy.GetRegistrationPolicy(ctx)
	if err != nil {
		return InstanceConfigView{}, fmt.Errorf("instance-admin update config policy read: %w", err)
	}
	cfg.RegistrationMode = string(policy.Mode)
	return cfg, nil
}

// ListOrganizations returns all organizations for admin overview.
func (s *Service) ListOrganizations(ctx context.Context) ([]AdminOrganizationView, error) {
	return s.orgLister.ListOrganizations(ctx)
}

// IsSMTPConfigured returns whether the instance has working SMTP.
func (s *Service) IsSMTPConfigured() bool {
	return s.emailSender.IsConfigured()
}

// SendTestEmail sends a test email to verify SMTP configuration.
func (s *Service) SendTestEmail(ctx context.Context, to string) error {
	cfg, err := s.instanceConfig.GetConfig(ctx)
	if err != nil {
		return fmt.Errorf("instance-admin send test email: %w", err)
	}
	siteURL := cfg.SiteURL
	if siteURL == "" {
		siteURL = "https://localhost"
	}
	return s.emailSender.SendTest(ctx, to, siteURL)
}
