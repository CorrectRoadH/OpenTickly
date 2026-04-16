package postgres

import (
	"context"
	"fmt"

	"opentoggl/backend/apps/backend/internal/telemetry/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Store reads the singleton instance_identity row seeded by migration 00008.
type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) GetInstanceID(ctx context.Context) (domain.InstanceID, error) {
	var raw uuid.UUID
	err := s.pool.QueryRow(ctx,
		`SELECT instance_id FROM instance_identity WHERE id = 1`,
	).Scan(&raw)
	if err != nil {
		return domain.InstanceID{}, fmt.Errorf("telemetry get instance id: %w", err)
	}
	return domain.InstanceID(raw), nil
}
