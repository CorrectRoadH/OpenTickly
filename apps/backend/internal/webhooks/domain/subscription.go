package domain

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"regexp"
	"time"
)

var filterValuePattern = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

type Subscription struct {
	ID             int64
	WorkspaceID    int64
	UserID         int64
	Description    string
	URLCallback    string
	Secret         string
	Enabled        bool
	ValidationCode string
	ValidatedAt    *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      *time.Time
	EventFilters   []EventFilter
}

type EventFilter struct {
	Entity string
	Action string
}

func GenerateSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate secret: %w", err)
	}
	return hex.EncodeToString(b), nil
}

func GenerateValidationCode() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate validation code: %w", err)
	}
	return hex.EncodeToString(b), nil
}

func ValidateEventFilter(f EventFilter) error {
	if f.Entity == "" {
		return fmt.Errorf("the entity field for each subscription event filter must be non-empty")
	}
	if f.Entity != "*" && !filterValuePattern.MatchString(f.Entity) {
		return fmt.Errorf("the value '%s' for the filter entity can only contain letters, numbers and '_' or be '*' to match all entities", f.Entity)
	}
	if f.Action == "" {
		return fmt.Errorf("the action field for each subscription event filter must be non-empty")
	}
	if f.Action != "*" && !filterValuePattern.MatchString(f.Action) {
		return fmt.Errorf("the value '%s' for the filter action can only contain letters, numbers and '_' or be '*' to match all actions", f.Action)
	}
	return nil
}

// SupportedEventFilters returns the known entities and their supported actions.
func SupportedEventFilters() map[string][]string {
	return map[string][]string{
		"client":     {"created", "updated", "deleted"},
		"project":    {"created", "updated", "deleted"},
		"tag":        {"created", "updated", "deleted"},
		"task":       {"created", "updated", "deleted"},
		"time_entry": {"created", "updated", "deleted"},
	}
}

// DefaultLimits returns workspace-level limits.
func DefaultLimits() (maxWebhooks int, maxEventsPerWebhook int) {
	return 5, 12
}
