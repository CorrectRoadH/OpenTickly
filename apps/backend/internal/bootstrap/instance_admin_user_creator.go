package bootstrap

import (
	"context"
	"fmt"

	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"

	"github.com/jackc/pgx/v5/pgxpool"
)

// identityUserCreator adapts the identity service to the instance-admin UserCreator port.
type identityUserCreator struct {
	identityApp *identityapplication.Service
	pool        *pgxpool.Pool
}

func (c *identityUserCreator) CreateUser(ctx context.Context, email string, password string, fullName string) (int64, error) {
	session, err := c.identityApp.Register(ctx, identityapplication.RegisterInput{
		Email:    email,
		FullName: fullName,
		Password: password,
	})
	if err != nil {
		return 0, fmt.Errorf("create bootstrap user: %w", err)
	}
	return session.User.ID, nil
}

func (c *identityUserCreator) MarkInstanceAdmin(ctx context.Context, userID int64) error {
	_, err := c.pool.Exec(ctx,
		`UPDATE identity_users SET is_instance_admin = true WHERE id = $1`,
		userID,
	)
	if err != nil {
		return fmt.Errorf("mark instance admin: %w", err)
	}
	return nil
}
