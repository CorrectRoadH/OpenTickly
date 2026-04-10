package postgres

import (
	"context"
	"fmt"
	"time"

	"opentoggl/backend/apps/backend/internal/webhooks/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) List(ctx context.Context, workspaceID int64) ([]domain.Subscription, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, workspace_id, user_id, description, url_callback, secret,
		        enabled, validation_code, validated_at, created_at, updated_at
		 FROM webhook_subscriptions
		 WHERE workspace_id = $1 AND deleted_at IS NULL
		 ORDER BY created_at DESC`,
		workspaceID,
	)
	if err != nil {
		return nil, fmt.Errorf("list webhook subscriptions: %w", err)
	}
	defer rows.Close()

	var subs []domain.Subscription
	for rows.Next() {
		sub, err := scanSubscription(rows)
		if err != nil {
			return nil, fmt.Errorf("list webhook subscriptions scan: %w", err)
		}
		subs = append(subs, sub)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if subs == nil {
		subs = []domain.Subscription{}
	}

	ids := make([]int64, len(subs))
	for i, sub := range subs {
		ids[i] = sub.ID
	}
	if len(ids) > 0 {
		filters, err := s.loadFilters(ctx, ids)
		if err != nil {
			return nil, err
		}
		for i := range subs {
			subs[i].EventFilters = filters[subs[i].ID]
			if subs[i].EventFilters == nil {
				subs[i].EventFilters = []domain.EventFilter{}
			}
		}
	}

	return subs, nil
}

func (s *Store) Get(ctx context.Context, workspaceID, subscriptionID int64) (domain.Subscription, error) {
	row := s.pool.QueryRow(ctx,
		`SELECT id, workspace_id, user_id, description, url_callback, secret,
		        enabled, validation_code, validated_at, created_at, updated_at
		 FROM webhook_subscriptions
		 WHERE workspace_id = $1 AND id = $2 AND deleted_at IS NULL`,
		workspaceID, subscriptionID,
	)
	sub, err := scanSubscriptionRow(row)
	if err != nil {
		return domain.Subscription{}, fmt.Errorf("get webhook subscription: %w", err)
	}
	filters, err := s.loadFilters(ctx, []int64{sub.ID})
	if err != nil {
		return domain.Subscription{}, err
	}
	sub.EventFilters = filters[sub.ID]
	if sub.EventFilters == nil {
		sub.EventFilters = []domain.EventFilter{}
	}
	return sub, nil
}

func (s *Store) GetByValidationCode(ctx context.Context, workspaceID, subscriptionID int64, code string) (domain.Subscription, error) {
	row := s.pool.QueryRow(ctx,
		`SELECT id, workspace_id, user_id, description, url_callback, secret,
		        enabled, validation_code, validated_at, created_at, updated_at
		 FROM webhook_subscriptions
		 WHERE workspace_id = $1 AND id = $2 AND validation_code = $3 AND deleted_at IS NULL`,
		workspaceID, subscriptionID, code,
	)
	sub, err := scanSubscriptionRow(row)
	if err != nil {
		return domain.Subscription{}, fmt.Errorf("get webhook subscription by validation code: %w", err)
	}
	return sub, nil
}

func (s *Store) Create(ctx context.Context, sub domain.Subscription) (domain.Subscription, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return domain.Subscription{}, fmt.Errorf("create webhook subscription begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var id int64
	err = tx.QueryRow(ctx,
		`INSERT INTO webhook_subscriptions
		    (workspace_id, user_id, description, url_callback, secret, enabled, validation_code, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id`,
		sub.WorkspaceID, sub.UserID, sub.Description, sub.URLCallback,
		sub.Secret, sub.Enabled, sub.ValidationCode, sub.CreatedAt, sub.UpdatedAt,
	).Scan(&id)
	if err != nil {
		return domain.Subscription{}, fmt.Errorf("create webhook subscription: %w", err)
	}
	sub.ID = id

	if err := s.insertFilters(ctx, tx, id, sub.EventFilters); err != nil {
		return domain.Subscription{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.Subscription{}, fmt.Errorf("create webhook subscription commit: %w", err)
	}
	return sub, nil
}

func (s *Store) Update(ctx context.Context, sub domain.Subscription) (domain.Subscription, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return domain.Subscription{}, fmt.Errorf("update webhook subscription begin: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx,
		`UPDATE webhook_subscriptions
		 SET description = $1, url_callback = $2, enabled = $3, updated_at = $4
		 WHERE id = $5 AND workspace_id = $6 AND deleted_at IS NULL`,
		sub.Description, sub.URLCallback, sub.Enabled, sub.UpdatedAt,
		sub.ID, sub.WorkspaceID,
	)
	if err != nil {
		return domain.Subscription{}, fmt.Errorf("update webhook subscription: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.Subscription{}, fmt.Errorf("update webhook subscription: %w", pgx.ErrNoRows)
	}

	_, err = tx.Exec(ctx,
		`DELETE FROM webhook_subscription_event_filters WHERE subscription_id = $1`, sub.ID)
	if err != nil {
		return domain.Subscription{}, fmt.Errorf("update webhook subscription clear filters: %w", err)
	}

	if err := s.insertFilters(ctx, tx, sub.ID, sub.EventFilters); err != nil {
		return domain.Subscription{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.Subscription{}, fmt.Errorf("update webhook subscription commit: %w", err)
	}
	return sub, nil
}

func (s *Store) SetEnabled(ctx context.Context, workspaceID, subscriptionID int64, enabled bool) (domain.Subscription, error) {
	now := time.Now().UTC()
	tag, err := s.pool.Exec(ctx,
		`UPDATE webhook_subscriptions SET enabled = $1, updated_at = $2
		 WHERE id = $3 AND workspace_id = $4 AND deleted_at IS NULL`,
		enabled, now, subscriptionID, workspaceID,
	)
	if err != nil {
		return domain.Subscription{}, fmt.Errorf("set enabled: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.Subscription{}, fmt.Errorf("set enabled: %w", pgx.ErrNoRows)
	}
	return s.Get(ctx, workspaceID, subscriptionID)
}

func (s *Store) Delete(ctx context.Context, workspaceID, subscriptionID int64) (domain.Subscription, error) {
	sub, err := s.Get(ctx, workspaceID, subscriptionID)
	if err != nil {
		return domain.Subscription{}, fmt.Errorf("delete webhook subscription get: %w", err)
	}

	now := time.Now().UTC()
	tag, err := s.pool.Exec(ctx,
		`UPDATE webhook_subscriptions SET deleted_at = $1, updated_at = $1
		 WHERE id = $2 AND workspace_id = $3 AND deleted_at IS NULL`,
		now, subscriptionID, workspaceID,
	)
	if err != nil {
		return domain.Subscription{}, fmt.Errorf("delete webhook subscription: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.Subscription{}, fmt.Errorf("delete webhook subscription: %w", pgx.ErrNoRows)
	}
	sub.DeletedAt = &now
	return sub, nil
}

func (s *Store) CountEnabled(ctx context.Context, workspaceID int64) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT count(*) FROM webhook_subscriptions
		 WHERE workspace_id = $1 AND enabled = true AND deleted_at IS NULL`,
		workspaceID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count enabled: %w", err)
	}
	return count, nil
}

func (s *Store) DescriptionExists(ctx context.Context, workspaceID int64, description string, excludeID int64) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM webhook_subscriptions
			WHERE workspace_id = $1 AND description = $2 AND id != $3 AND deleted_at IS NULL
		)`,
		workspaceID, description, excludeID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("description exists: %w", err)
	}
	return exists, nil
}

func (s *Store) SetValidated(ctx context.Context, workspaceID, subscriptionID int64) (domain.Subscription, error) {
	now := time.Now().UTC()
	tag, err := s.pool.Exec(ctx,
		`UPDATE webhook_subscriptions SET validated_at = $1, updated_at = $1
		 WHERE id = $2 AND workspace_id = $3 AND deleted_at IS NULL`,
		now, subscriptionID, workspaceID,
	)
	if err != nil {
		return domain.Subscription{}, fmt.Errorf("set validated: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.Subscription{}, fmt.Errorf("set validated: %w", pgx.ErrNoRows)
	}
	return s.Get(ctx, workspaceID, subscriptionID)
}

// --- internal helpers ---

func (s *Store) insertFilters(ctx context.Context, tx pgx.Tx, subscriptionID int64, filters []domain.EventFilter) error {
	for _, f := range filters {
		_, err := tx.Exec(ctx,
			`INSERT INTO webhook_subscription_event_filters (subscription_id, entity, action)
			 VALUES ($1, $2, $3)`,
			subscriptionID, f.Entity, f.Action,
		)
		if err != nil {
			return fmt.Errorf("insert event filter: %w", err)
		}
	}
	return nil
}

func (s *Store) loadFilters(ctx context.Context, subscriptionIDs []int64) (map[int64][]domain.EventFilter, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT subscription_id, entity, action
		 FROM webhook_subscription_event_filters
		 WHERE subscription_id = ANY($1)
		 ORDER BY id`,
		subscriptionIDs,
	)
	if err != nil {
		return nil, fmt.Errorf("load event filters: %w", err)
	}
	defer rows.Close()

	result := make(map[int64][]domain.EventFilter)
	for rows.Next() {
		var subID int64
		var f domain.EventFilter
		if err := rows.Scan(&subID, &f.Entity, &f.Action); err != nil {
			return nil, fmt.Errorf("load event filters scan: %w", err)
		}
		result[subID] = append(result[subID], f)
	}
	return result, rows.Err()
}

func scanSubscription(rows pgx.Rows) (domain.Subscription, error) {
	var sub domain.Subscription
	err := rows.Scan(
		&sub.ID, &sub.WorkspaceID, &sub.UserID, &sub.Description, &sub.URLCallback,
		&sub.Secret, &sub.Enabled, &sub.ValidationCode, &sub.ValidatedAt,
		&sub.CreatedAt, &sub.UpdatedAt,
	)
	return sub, err
}

func scanSubscriptionRow(row pgx.Row) (domain.Subscription, error) {
	var sub domain.Subscription
	err := row.Scan(
		&sub.ID, &sub.WorkspaceID, &sub.UserID, &sub.Description, &sub.URLCallback,
		&sub.Secret, &sub.Enabled, &sub.ValidationCode, &sub.ValidatedAt,
		&sub.CreatedAt, &sub.UpdatedAt,
	)
	return sub, err
}
