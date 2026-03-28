package bootstrap

import (
	"context"
	"fmt"

	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/instance-admin/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// registrationPolicyGuard reads registration policy directly from postgres
// to avoid a circular dependency between identity and instance-admin services.
type registrationPolicyGuard struct {
	pool *pgxpool.Pool
}

func (g *registrationPolicyGuard) CanRegister(ctx context.Context) error {
	var modeStr string
	err := g.pool.QueryRow(ctx,
		`SELECT mode FROM instance_admin_registration_policy WHERE id = 1`,
	).Scan(&modeStr)
	if err == pgx.ErrNoRows {
		// No policy row yet means instance hasn't been bootstrapped.
		// Before bootstrap, registration should be open so bootstrap can create the first user.
		return nil
	}
	if err != nil {
		return fmt.Errorf("registration guard: %w", err)
	}

	switch domain.RegistrationMode(modeStr) {
	case domain.RegistrationModeOpen:
		return nil
	case domain.RegistrationModeClosed:
		return identityapplication.ErrRegistrationClosed
	case domain.RegistrationModeInviteOnly:
		return identityapplication.ErrRegistrationClosed
	default:
		return identityapplication.ErrRegistrationClosed
	}
}
