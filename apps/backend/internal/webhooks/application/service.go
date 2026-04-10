package application

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"opentoggl/backend/apps/backend/internal/log"
	"opentoggl/backend/apps/backend/internal/webhooks/domain"
)

type Store interface {
	List(ctx context.Context, workspaceID int64) ([]domain.Subscription, error)
	Get(ctx context.Context, workspaceID, subscriptionID int64) (domain.Subscription, error)
	GetByValidationCode(ctx context.Context, workspaceID, subscriptionID int64, code string) (domain.Subscription, error)
	Create(ctx context.Context, sub domain.Subscription) (domain.Subscription, error)
	Update(ctx context.Context, sub domain.Subscription) (domain.Subscription, error)
	SetEnabled(ctx context.Context, workspaceID, subscriptionID int64, enabled bool) (domain.Subscription, error)
	Delete(ctx context.Context, workspaceID, subscriptionID int64) (domain.Subscription, error)
	CountEnabled(ctx context.Context, workspaceID int64) (int, error)
	DescriptionExists(ctx context.Context, workspaceID int64, description string, excludeID int64) (bool, error)
	SetValidated(ctx context.Context, workspaceID, subscriptionID int64) (domain.Subscription, error)
}

type Service struct {
	store  Store
	logger log.Logger
}

func NewService(store Store, logger log.Logger) *Service {
	return &Service{store: store, logger: logger}
}

func (s *Service) ListSubscriptions(ctx context.Context, workspaceID int64) ([]domain.Subscription, error) {
	return s.store.List(ctx, workspaceID)
}

type CreateSubscriptionCommand struct {
	WorkspaceID  int64
	UserID       int64
	Description  string
	URLCallback  string
	Enabled      bool
	EventFilters []domain.EventFilter
}

func (s *Service) CreateSubscription(ctx context.Context, cmd CreateSubscriptionCommand) (domain.Subscription, error) {
	if cmd.Description == "" {
		return domain.Subscription{}, fmt.Errorf("subscription description must not be empty")
	}
	if len(cmd.EventFilters) == 0 {
		return domain.Subscription{}, fmt.Errorf("the list of event filters must not be empty")
	}

	maxWebhooks, maxEvents := domain.DefaultLimits()

	if len(cmd.EventFilters) > maxEvents {
		return domain.Subscription{}, fmt.Errorf("the limit of %d event filters for your subscription has been exceeded as you're trying to set %d filters", maxEvents, len(cmd.EventFilters))
	}

	if err := validateFilters(cmd.EventFilters); err != nil {
		return domain.Subscription{}, err
	}

	exists, err := s.store.DescriptionExists(ctx, cmd.WorkspaceID, cmd.Description, 0)
	if err != nil {
		return domain.Subscription{}, err
	}
	if exists {
		return domain.Subscription{}, fmt.Errorf("subscription description '%s' is already in use for workspace %d", cmd.Description, cmd.WorkspaceID)
	}

	if cmd.Enabled {
		count, err := s.store.CountEnabled(ctx, cmd.WorkspaceID)
		if err != nil {
			return domain.Subscription{}, err
		}
		if count >= maxWebhooks {
			return domain.Subscription{}, fmt.Errorf("user %d already reached the limit of %d enabled subscriptions for workspace %d", cmd.UserID, maxWebhooks, cmd.WorkspaceID)
		}
	}

	if err := probeCallback(cmd.URLCallback); err != nil {
		return domain.Subscription{}, err
	}

	secret, err := domain.GenerateSecret()
	if err != nil {
		return domain.Subscription{}, err
	}
	validationCode, err := domain.GenerateValidationCode()
	if err != nil {
		return domain.Subscription{}, err
	}

	now := time.Now().UTC()
	sub := domain.Subscription{
		WorkspaceID:    cmd.WorkspaceID,
		UserID:         cmd.UserID,
		Description:    cmd.Description,
		URLCallback:    cmd.URLCallback,
		Secret:         secret,
		Enabled:        cmd.Enabled,
		ValidationCode: validationCode,
		EventFilters:   cmd.EventFilters,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	return s.store.Create(ctx, sub)
}

type UpdateSubscriptionCommand struct {
	WorkspaceID    int64
	SubscriptionID int64
	UserID         int64
	Description    string
	URLCallback    string
	Enabled        bool
	EventFilters   []domain.EventFilter
}

func (s *Service) UpdateSubscription(ctx context.Context, cmd UpdateSubscriptionCommand) (domain.Subscription, error) {
	if cmd.Description == "" {
		return domain.Subscription{}, fmt.Errorf("subscription description must not be empty")
	}
	if len(cmd.EventFilters) == 0 {
		return domain.Subscription{}, fmt.Errorf("the list of event filters must not be empty")
	}

	_, maxEvents := domain.DefaultLimits()

	if len(cmd.EventFilters) > maxEvents {
		return domain.Subscription{}, fmt.Errorf("the limit of %d event filters for your subscription has been exceeded as you're trying to set %d filters", maxEvents, len(cmd.EventFilters))
	}

	if err := validateFilters(cmd.EventFilters); err != nil {
		return domain.Subscription{}, err
	}

	existing, err := s.store.Get(ctx, cmd.WorkspaceID, cmd.SubscriptionID)
	if err != nil {
		return domain.Subscription{}, err
	}

	exists, err := s.store.DescriptionExists(ctx, cmd.WorkspaceID, cmd.Description, cmd.SubscriptionID)
	if err != nil {
		return domain.Subscription{}, err
	}
	if exists {
		return domain.Subscription{}, fmt.Errorf("subscription description '%s' is already in use for workspace %d", cmd.Description, cmd.WorkspaceID)
	}

	if cmd.Enabled && !existing.Enabled {
		maxWebhooks, _ := domain.DefaultLimits()
		count, err := s.store.CountEnabled(ctx, cmd.WorkspaceID)
		if err != nil {
			return domain.Subscription{}, err
		}
		if count >= maxWebhooks {
			return domain.Subscription{}, fmt.Errorf("user %d already reached the limit of %d enabled subscriptions for workspace %d", cmd.UserID, maxWebhooks, cmd.WorkspaceID)
		}
	}

	if err := probeCallback(cmd.URLCallback); err != nil {
		return domain.Subscription{}, err
	}

	existing.Description = cmd.Description
	existing.URLCallback = cmd.URLCallback
	existing.Enabled = cmd.Enabled
	existing.EventFilters = cmd.EventFilters
	existing.UpdatedAt = time.Now().UTC()

	return s.store.Update(ctx, existing)
}

func (s *Service) PatchSubscription(ctx context.Context, workspaceID, subscriptionID, userID int64, enabled bool) (domain.Subscription, error) {
	existing, err := s.store.Get(ctx, workspaceID, subscriptionID)
	if err != nil {
		return domain.Subscription{}, err
	}

	if enabled && !existing.Enabled {
		maxWebhooks, _ := domain.DefaultLimits()
		count, err := s.store.CountEnabled(ctx, workspaceID)
		if err != nil {
			return domain.Subscription{}, err
		}
		if count >= maxWebhooks {
			return domain.Subscription{}, fmt.Errorf("user %d already reached the limit of %d enabled subscriptions for workspace %d", userID, maxWebhooks, workspaceID)
		}

		if err := probeCallback(existing.URLCallback); err != nil {
			return domain.Subscription{}, err
		}
	}

	return s.store.SetEnabled(ctx, workspaceID, subscriptionID, enabled)
}

func (s *Service) DeleteSubscription(ctx context.Context, workspaceID, subscriptionID int64) (domain.Subscription, error) {
	return s.store.Delete(ctx, workspaceID, subscriptionID)
}

func (s *Service) Ping(ctx context.Context, workspaceID, subscriptionID int64) error {
	sub, err := s.store.Get(ctx, workspaceID, subscriptionID)
	if err != nil {
		return err
	}
	return probeCallback(sub.URLCallback)
}

func (s *Service) Validate(ctx context.Context, workspaceID, subscriptionID int64, validationCode string) (domain.Subscription, error) {
	sub, err := s.store.GetByValidationCode(ctx, workspaceID, subscriptionID, validationCode)
	if err != nil {
		return domain.Subscription{}, fmt.Errorf("subscription %d for workspace %d and validation code '%s' was not found", subscriptionID, workspaceID, validationCode)
	}
	if sub.ValidatedAt != nil {
		return domain.Subscription{}, fmt.Errorf("subscription %d has already been validated", subscriptionID)
	}
	return s.store.SetValidated(ctx, workspaceID, subscriptionID)
}

func validateFilters(filters []domain.EventFilter) error {
	seen := make(map[string]bool, len(filters))
	for _, f := range filters {
		if err := domain.ValidateEventFilter(f); err != nil {
			return err
		}
		key := f.Entity + ":" + f.Action
		if seen[key] {
			return fmt.Errorf("the following event filter appears more than once for your subscription: %s", key)
		}
		seen[key] = true
	}
	return nil
}

func probeCallback(url string) error {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return fmt.Errorf("URL endpoint %s request failed with error: %v", url, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("URL endpoint %s responded with status %d instead of 200", url, resp.StatusCode)
	}
	return nil
}
