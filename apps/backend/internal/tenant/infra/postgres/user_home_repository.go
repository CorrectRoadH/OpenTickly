package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserHomeRepository struct {
	pool *pgxpool.Pool
}

func NewUserHomeRepository(pool *pgxpool.Pool) *UserHomeRepository {
	return &UserHomeRepository{pool: pool}
}

func (repository *UserHomeRepository) FindByUserID(
	ctx context.Context,
	userID int64,
) (organizationID int64, workspaceID int64, found bool, err error) {
	err = repository.pool.QueryRow(ctx, `
		select organization_id, workspace_id
		from web_user_homes
		where user_id = $1
	`, userID).Scan(&organizationID, &workspaceID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, 0, false, nil
		}
		return 0, 0, false, fmt.Errorf("query web user home for user %d: %w", userID, err)
	}
	return organizationID, workspaceID, true, nil
}

func (repository *UserHomeRepository) Save(
	ctx context.Context,
	userID int64,
	organizationID int64,
	workspaceID int64,
) error {
	_, err := repository.pool.Exec(ctx, `
		insert into web_user_homes (user_id, organization_id, workspace_id)
		values ($1, $2, $3)
		on conflict (user_id) do update
		set organization_id = excluded.organization_id,
			workspace_id = excluded.workspace_id
	`, userID, organizationID, workspaceID)
	if err != nil {
		return fmt.Errorf("save web user home for user %d: %w", userID, err)
	}
	return nil
}
