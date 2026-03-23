package postgres

import (
	"context"
	"fmt"

	"opentoggl/backend/apps/backend/internal/identity/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PushServiceRepository struct {
	pool *pgxpool.Pool
}

func NewPushServiceRepository(pool *pgxpool.Pool) *PushServiceRepository {
	return &PushServiceRepository{pool: pool}
}

func (repo *PushServiceRepository) ListByUserID(ctx context.Context, userID int64) ([]domain.PushService, error) {
	rows, err := repo.pool.Query(ctx, `
		select fcm_registration_token
		from identity_push_services
		where user_id = $1
		order by fcm_registration_token asc
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list identity push services for user %d: %w", userID, err)
	}
	defer rows.Close()

	pushServices := make([]domain.PushService, 0)
	for rows.Next() {
		var token string
		if err := rows.Scan(&token); err != nil {
			return nil, fmt.Errorf("scan identity push service for user %d: %w", userID, err)
		}
		pushService, err := domain.NewPushService(userID, token)
		if err != nil {
			return nil, fmt.Errorf("hydrate identity push service for user %d: %w", userID, err)
		}
		pushServices = append(pushServices, pushService)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate identity push services for user %d: %w", userID, err)
	}
	return pushServices, nil
}

func (repo *PushServiceRepository) Save(ctx context.Context, pushService domain.PushService) error {
	if _, err := repo.pool.Exec(ctx, `
		insert into identity_push_services (user_id, fcm_registration_token)
		values ($1, $2)
		on conflict (user_id, fcm_registration_token) do nothing
	`, pushService.UserID(), pushService.Token().String()); err != nil {
		return fmt.Errorf("save identity push service for user %d: %w", pushService.UserID(), err)
	}
	return nil
}

func (repo *PushServiceRepository) Delete(ctx context.Context, userID int64, token domain.PushServiceToken) error {
	if _, err := repo.pool.Exec(ctx, `
		delete from identity_push_services
		where user_id = $1 and fcm_registration_token = $2
	`, userID, token.String()); err != nil {
		return fmt.Errorf("delete identity push service for user %d: %w", userID, err)
	}
	return nil
}
