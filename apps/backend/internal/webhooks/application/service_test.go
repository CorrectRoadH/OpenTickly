package application

import (
	"context"
	"errors"
	"testing"

	"opentoggl/backend/apps/backend/internal/log"
	"opentoggl/backend/apps/backend/internal/webhooks/domain"
)

func TestCreateSubscriptionDoesNotProbeDisabledCallback(t *testing.T) {
	store := newMemoryStore()
	prober := &recordingProber{err: errors.New("probe should not run")}
	service := NewService(store, log.NopLogger(), prober)

	sub, err := service.CreateSubscription(context.Background(), CreateSubscriptionCommand{
		WorkspaceID:  42,
		UserID:       7,
		Description:  "disabled draft",
		URLCallback:  "https://example.com/webhook",
		Enabled:      false,
		EventFilters: []domain.EventFilter{{Entity: "time_entry", Action: "created"}},
	})
	if err != nil {
		t.Fatalf("create disabled subscription: %v", err)
	}
	if prober.calls != 0 {
		t.Fatalf("expected no callback probe for disabled subscription, got %d", prober.calls)
	}
	if sub.ValidatedAt != nil {
		t.Fatal("disabled subscription should not be auto-validated before probing")
	}
}

func TestCreateSubscriptionProbesEnabledCallback(t *testing.T) {
	store := newMemoryStore()
	prober := &recordingProber{}
	service := NewService(store, log.NopLogger(), prober)

	sub, err := service.CreateSubscription(context.Background(), CreateSubscriptionCommand{
		WorkspaceID:  42,
		UserID:       7,
		Description:  "enabled hook",
		URLCallback:  "https://example.com/webhook",
		Enabled:      true,
		EventFilters: []domain.EventFilter{{Entity: "time_entry", Action: "created"}},
	})
	if err != nil {
		t.Fatalf("create enabled subscription: %v", err)
	}
	if prober.calls != 1 {
		t.Fatalf("expected one callback probe for enabled subscription, got %d", prober.calls)
	}
	if sub.ValidatedAt == nil {
		t.Fatal("enabled subscription should be auto-validated after a successful probe")
	}
}

type recordingProber struct {
	calls int
	err   error
}

func (p *recordingProber) Probe(context.Context, string) error {
	p.calls++
	return p.err
}

type memoryStore struct {
	nextID int64
	subs   []domain.Subscription
}

func newMemoryStore() *memoryStore {
	return &memoryStore{nextID: 1}
}

func (s *memoryStore) List(context.Context, int64) ([]domain.Subscription, error) {
	return s.subs, nil
}

func (s *memoryStore) Get(_ context.Context, workspaceID, subscriptionID int64) (domain.Subscription, error) {
	for _, sub := range s.subs {
		if sub.WorkspaceID == workspaceID && sub.ID == subscriptionID && sub.DeletedAt == nil {
			return sub, nil
		}
	}
	return domain.Subscription{}, errors.New("subscription not found")
}

func (s *memoryStore) GetByValidationCode(
	_ context.Context,
	workspaceID int64,
	subscriptionID int64,
	code string,
) (domain.Subscription, error) {
	for _, sub := range s.subs {
		if sub.WorkspaceID == workspaceID &&
			sub.ID == subscriptionID &&
			sub.ValidationCode == code &&
			sub.DeletedAt == nil {
			return sub, nil
		}
	}
	return domain.Subscription{}, errors.New("subscription not found")
}

func (s *memoryStore) Create(_ context.Context, sub domain.Subscription) (domain.Subscription, error) {
	sub.ID = s.nextID
	s.nextID++
	s.subs = append(s.subs, sub)
	return sub, nil
}

func (s *memoryStore) Update(_ context.Context, sub domain.Subscription) (domain.Subscription, error) {
	for i := range s.subs {
		if s.subs[i].WorkspaceID == sub.WorkspaceID && s.subs[i].ID == sub.ID {
			s.subs[i] = sub
			return sub, nil
		}
	}
	return domain.Subscription{}, errors.New("subscription not found")
}

func (s *memoryStore) SetEnabled(
	ctx context.Context,
	workspaceID int64,
	subscriptionID int64,
	enabled bool,
) (domain.Subscription, error) {
	sub, err := s.Get(ctx, workspaceID, subscriptionID)
	if err != nil {
		return domain.Subscription{}, err
	}
	sub.Enabled = enabled
	return s.Update(ctx, sub)
}

func (s *memoryStore) Delete(
	ctx context.Context,
	workspaceID int64,
	subscriptionID int64,
) (domain.Subscription, error) {
	sub, err := s.Get(ctx, workspaceID, subscriptionID)
	if err != nil {
		return domain.Subscription{}, err
	}
	now := sub.UpdatedAt
	sub.DeletedAt = &now
	return s.Update(ctx, sub)
}

func (s *memoryStore) CountEnabled(_ context.Context, workspaceID int64) (int, error) {
	count := 0
	for _, sub := range s.subs {
		if sub.WorkspaceID == workspaceID && sub.Enabled && sub.DeletedAt == nil {
			count++
		}
	}
	return count, nil
}

func (s *memoryStore) DescriptionExists(
	_ context.Context,
	workspaceID int64,
	description string,
	excludeID int64,
) (bool, error) {
	for _, sub := range s.subs {
		if sub.WorkspaceID == workspaceID &&
			sub.Description == description &&
			sub.ID != excludeID &&
			sub.DeletedAt == nil {
			return true, nil
		}
	}
	return false, nil
}

func (s *memoryStore) SetValidated(
	ctx context.Context,
	workspaceID int64,
	subscriptionID int64,
) (domain.Subscription, error) {
	sub, err := s.Get(ctx, workspaceID, subscriptionID)
	if err != nil {
		return domain.Subscription{}, err
	}
	now := sub.UpdatedAt
	sub.ValidatedAt = &now
	return s.Update(ctx, sub)
}
