package domain

import (
	"errors"
	"time"
)

var ErrBootstrapAlreadyCompleted = errors.New("instance bootstrap has already been completed")

// BootstrapState represents the one-time instance initialization state.
type BootstrapState struct {
	Completed   bool
	AdminEmail  string
	CompletedAt *time.Time
}

// NewBootstrapState returns a fresh, uncompleted bootstrap state.
func NewBootstrapState() BootstrapState {
	return BootstrapState{Completed: false}
}

// Complete marks bootstrap as done. Returns ErrBootstrapAlreadyCompleted if
// called more than once.
func (s *BootstrapState) Complete(adminEmail string, now time.Time) error {
	if s.Completed {
		return ErrBootstrapAlreadyCompleted
	}
	s.Completed = true
	s.AdminEmail = adminEmail
	s.CompletedAt = &now
	return nil
}
