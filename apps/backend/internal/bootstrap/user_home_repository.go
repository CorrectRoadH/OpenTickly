package bootstrap

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type userHomeRepository interface {
	FindByUserID(context.Context, int64) (sessionHome, bool, error)
	Save(context.Context, int64, sessionHome) error
}

type postgresUserHomeRepository struct {
	pool *pgxpool.Pool
}

func newPostgresUserHomeRepository(pool *pgxpool.Pool) *postgresUserHomeRepository {
	return &postgresUserHomeRepository{pool: pool}
}

func (repository *postgresUserHomeRepository) FindByUserID(
	ctx context.Context,
	userID int64,
) (sessionHome, bool, error) {
	var home sessionHome
	err := repository.pool.QueryRow(ctx, `
		select organization_id, workspace_id
		from web_user_homes
		where user_id = $1
	`, userID).Scan(&home.organizationID, &home.workspaceID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return sessionHome{}, false, nil
		}
		return sessionHome{}, false, fmt.Errorf("query web user home for user %d: %w", userID, err)
	}
	return home, true, nil
}

func (repository *postgresUserHomeRepository) Save(
	ctx context.Context,
	userID int64,
	home sessionHome,
) error {
	_, err := repository.pool.Exec(ctx, `
		insert into web_user_homes (user_id, organization_id, workspace_id)
		values ($1, $2, $3)
		on conflict (user_id) do update
		set organization_id = excluded.organization_id,
			workspace_id = excluded.workspace_id
	`, userID, home.organizationID, home.workspaceID)
	if err != nil {
		return fmt.Errorf("save web user home for user %d: %w", userID, err)
	}
	return nil
}
