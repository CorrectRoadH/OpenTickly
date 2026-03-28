package domain

import (
	"errors"
	"time"
)

var (
	ErrInvalidRegistrationMode = errors.New("invalid registration mode")
)

type RegistrationMode string

const (
	RegistrationModeOpen       RegistrationMode = "open"
	RegistrationModeClosed     RegistrationMode = "closed"
	RegistrationModeInviteOnly RegistrationMode = "invite_only"
)

func ParseRegistrationMode(s string) (RegistrationMode, error) {
	switch RegistrationMode(s) {
	case RegistrationModeOpen, RegistrationModeClosed, RegistrationModeInviteOnly:
		return RegistrationMode(s), nil
	default:
		return "", ErrInvalidRegistrationMode
	}
}

// RegistrationPolicy is the instance-level aggregate root controlling
// whether new users can register.
type RegistrationPolicy struct {
	Mode      RegistrationMode
	UpdatedAt time.Time
}

// NewDefaultPolicy returns the default policy for a fresh instance.
// Defaults to closed until the admin explicitly opens registration.
func NewDefaultPolicy(now time.Time) RegistrationPolicy {
	return RegistrationPolicy{
		Mode:      RegistrationModeClosed,
		UpdatedAt: now,
	}
}

// SetMode transitions the policy to a new mode.
func (p *RegistrationPolicy) SetMode(mode RegistrationMode, now time.Time) {
	p.Mode = mode
	p.UpdatedAt = now
}
