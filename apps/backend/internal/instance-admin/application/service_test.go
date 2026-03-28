package application

import (
	"context"
	"errors"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/instance-admin/domain"
)

type fixedClock struct{ now time.Time }

func (c fixedClock) Now() time.Time { return c.now }

type memBootstrapStore struct {
	state domain.BootstrapState
}

func (s *memBootstrapStore) GetBootstrapState(_ context.Context) (domain.BootstrapState, error) {
	return s.state, nil
}
func (s *memBootstrapStore) CompleteBootstrap(_ context.Context, email string, at time.Time) error {
	s.state.Completed = true
	s.state.AdminEmail = email
	s.state.CompletedAt = &at
	return nil
}

type memRegistrationPolicyStore struct {
	policy domain.RegistrationPolicy
}

func (s *memRegistrationPolicyStore) GetRegistrationPolicy(_ context.Context) (domain.RegistrationPolicy, error) {
	return s.policy, nil
}
func (s *memRegistrationPolicyStore) SetRegistrationPolicy(_ context.Context, mode domain.RegistrationMode, at time.Time) error {
	s.policy.Mode = mode
	s.policy.UpdatedAt = at
	return nil
}

type memUserCreator struct {
	nextID  int64
	created []struct {
		ID    int64
		Email string
		Admin bool
	}
}

func (c *memUserCreator) CreateUser(_ context.Context, email string, _ string, _ string) (int64, error) {
	c.nextID++
	c.created = append(c.created, struct {
		ID    int64
		Email string
		Admin bool
	}{ID: c.nextID, Email: email})
	return c.nextID, nil
}
func (c *memUserCreator) MarkInstanceAdmin(_ context.Context, userID int64) error {
	for i := range c.created {
		if c.created[i].ID == userID {
			c.created[i].Admin = true
			return nil
		}
	}
	return domain.ErrInstanceUserNotFound
}

type memInstanceUserStore struct {
	users []InstanceUserView
}

func (s *memInstanceUserStore) ListUsers(_ context.Context, filter InstanceUserFilter) (InstanceUserPage, error) {
	return InstanceUserPage{
		Users:      s.users,
		TotalCount: len(s.users),
		Page:       filter.Page,
		PerPage:    filter.PerPage,
	}, nil
}
func (s *memInstanceUserStore) DisableUser(_ context.Context, userID int64) error {
	for i := range s.users {
		if s.users[i].ID == userID && s.users[i].Status == "active" {
			s.users[i].Status = "disabled"
			return nil
		}
	}
	return domain.ErrInstanceUserNotFound
}
func (s *memInstanceUserStore) RestoreUser(_ context.Context, userID int64) error {
	for i := range s.users {
		if s.users[i].ID == userID && s.users[i].Status == "disabled" {
			s.users[i].Status = "active"
			return nil
		}
	}
	return domain.ErrInstanceUserNotFound
}
func (s *memInstanceUserStore) CountUsers(_ context.Context) (int, error) {
	return len(s.users), nil
}

type memInstanceConfigStore struct {
	cfg InstanceConfigView
}

func (s *memInstanceConfigStore) GetConfig(_ context.Context) (InstanceConfigView, error) {
	return s.cfg, nil
}
func (s *memInstanceConfigStore) UpdateConfig(_ context.Context, update InstanceConfigUpdate) (InstanceConfigView, error) {
	if update.SiteURL != nil {
		s.cfg.SiteURL = *update.SiteURL
	}
	return s.cfg, nil
}

type memEmailSender struct{ configured bool }

func (s *memEmailSender) IsConfigured() bool { return s.configured }
func (s *memEmailSender) Send(_ context.Context, _ string, _ string, _ string) error {
	return nil
}
func (s *memEmailSender) SendTest(_ context.Context, _ string, _ string) error { return nil }

type memOrgLister struct{}

func (s *memOrgLister) ListOrganizations(_ context.Context) ([]AdminOrganizationView, error) {
	return []AdminOrganizationView{}, nil
}

func newTestService(t *testing.T) (*Service, *memBootstrapStore, *memRegistrationPolicyStore, *memInstanceUserStore, *memUserCreator, fixedClock) {
	t.Helper()
	now := time.Date(2026, 3, 28, 12, 0, 0, 0, time.UTC)
	clock := fixedClock{now: now}
	bs := &memBootstrapStore{state: domain.NewBootstrapState()}
	rps := &memRegistrationPolicyStore{policy: domain.NewDefaultPolicy(now)}
	us := &memInstanceUserStore{}
	uc := &memUserCreator{}
	svc, err := NewService(Config{
		Bootstrap:          bs,
		RegistrationPolicy: rps,
		InstanceUsers:      us,
		InstanceConfig:     &memInstanceConfigStore{},
		OrgLister:          &memOrgLister{},
		UserCreator:        uc,
		EmailSender:        &memEmailSender{configured: true},
		Clock:              clock,
	})
	if err != nil {
		t.Fatal(err)
	}
	return svc, bs, rps, us, uc, clock
}

func TestBootstrap_FirstTime(t *testing.T) {
	svc, bs, rps, _, uc, _ := newTestService(t)
	ctx := context.Background()

	state, err := svc.Bootstrap(ctx, BootstrapCommand{
		Email:    "admin@example.com",
		Password: "securepassword",
	})
	if err != nil {
		t.Fatalf("bootstrap should succeed: %v", err)
	}
	if !state.Completed {
		t.Fatal("state should be completed")
	}
	if state.AdminEmail != "admin@example.com" {
		t.Fatalf("admin email mismatch: %q", state.AdminEmail)
	}
	if !bs.state.Completed {
		t.Fatal("store should reflect completed state")
	}
	if len(uc.created) != 1 {
		t.Fatalf("expected 1 user created, got %d", len(uc.created))
	}
	if uc.created[0].Email != "admin@example.com" {
		t.Fatalf("created user email mismatch: %q", uc.created[0].Email)
	}
	if !uc.created[0].Admin {
		t.Fatal("created user should be marked as instance admin")
	}
	if rps.policy.Mode != domain.RegistrationModeClosed {
		t.Fatalf("registration policy should be closed after bootstrap, got: %v", rps.policy.Mode)
	}
}

func TestBootstrap_RejectsSecondAttempt(t *testing.T) {
	svc, _, _, _, _, _ := newTestService(t)
	ctx := context.Background()

	_, _ = svc.Bootstrap(ctx, BootstrapCommand{Email: "admin@example.com", Password: "pass"})

	_, err := svc.Bootstrap(ctx, BootstrapCommand{Email: "other@example.com", Password: "pass"})
	if !errors.Is(err, domain.ErrBootstrapAlreadyCompleted) {
		t.Fatalf("second bootstrap should fail with ErrBootstrapAlreadyCompleted, got: %v", err)
	}
}

func TestSetRegistrationPolicy(t *testing.T) {
	svc, _, _, _, _, _ := newTestService(t)
	ctx := context.Background()

	policy, err := svc.SetRegistrationPolicy(ctx, "open")
	if err != nil {
		t.Fatalf("set policy should succeed: %v", err)
	}
	if policy.Mode != domain.RegistrationModeOpen {
		t.Fatalf("mode should be open, got: %v", policy.Mode)
	}
}

func TestSetRegistrationPolicy_InvalidMode(t *testing.T) {
	svc, _, _, _, _, _ := newTestService(t)
	ctx := context.Background()

	_, err := svc.SetRegistrationPolicy(ctx, "invalid")
	if !errors.Is(err, domain.ErrInvalidRegistrationMode) {
		t.Fatalf("should reject invalid mode, got: %v", err)
	}
}

func TestDisableAndRestoreUser(t *testing.T) {
	svc, _, _, us, _, _ := newTestService(t)
	ctx := context.Background()
	us.users = []InstanceUserView{
		{ID: 1, Email: "user@example.com", Status: "active"},
	}

	if err := svc.DisableInstanceUser(ctx, 1); err != nil {
		t.Fatalf("disable should succeed: %v", err)
	}
	if us.users[0].Status != "disabled" {
		t.Fatal("user should be disabled")
	}

	if err := svc.RestoreInstanceUser(ctx, 1); err != nil {
		t.Fatalf("restore should succeed: %v", err)
	}
	if us.users[0].Status != "active" {
		t.Fatal("user should be active")
	}
}

func TestDisableUser_NotFound(t *testing.T) {
	svc, _, _, _, _, _ := newTestService(t)
	ctx := context.Background()

	err := svc.DisableInstanceUser(ctx, 999)
	if !errors.Is(err, domain.ErrInstanceUserNotFound) {
		t.Fatalf("should return not found, got: %v", err)
	}
}
