package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func writeGovernanceError(operation string, err error) error {
	return fmt.Errorf("%s: %w", operation, err)
}

func mustJSON(value any, fallback string) []byte {
	if value == nil {
		return []byte(fallback)
	}
	encoded, err := json.Marshal(value)
	if err != nil {
		return []byte(fallback)
	}
	return encoded
}

func decodeInt64s(raw []byte) []int64 {
	if len(raw) == 0 {
		return []int64{}
	}
	var values []int64
	if err := json.Unmarshal(raw, &values); err != nil {
		return []int64{}
	}
	return values
}

func decodeInts(raw []byte) []int {
	if len(raw) == 0 {
		return []int{}
	}
	var values []int
	if err := json.Unmarshal(raw, &values); err != nil {
		return []int{}
	}
	return values
}

func decodeStrings(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var values []string
	if err := json.Unmarshal(raw, &values); err != nil {
		return []string{}
	}
	return values
}

func decodeApproverLayers(raw []byte) map[string][]int64 {
	if len(raw) == 0 {
		return map[string][]int64{}
	}
	var values map[string][]int64
	if err := json.Unmarshal(raw, &values); err != nil {
		return map[string][]int64{}
	}
	return values
}

func decodeReviews(raw []byte) []governanceapplication.TimesheetReviewView {
	if len(raw) == 0 {
		return []governanceapplication.TimesheetReviewView{}
	}
	var values []governanceapplication.TimesheetReviewView
	if err := json.Unmarshal(raw, &values); err != nil {
		return []governanceapplication.TimesheetReviewView{}
	}
	return values
}

func (store *Store) lookupKnownUsers(ctx context.Context, userIDs []int64) (map[int64]string, error) {
	if len(userIDs) == 0 {
		return map[int64]string{}, nil
	}
	rows, err := store.pool.Query(ctx, `
		select id, full_name
		from identity_users
		where id = any($1)
	`, userIDs)
	if err != nil {
		return nil, writeGovernanceError("lookup users", err)
	}
	defer rows.Close()

	names := make(map[int64]string, len(userIDs))
	for rows.Next() {
		var id int64
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, writeGovernanceError("scan user", err)
		}
		names[id] = name
	}
	if err := rows.Err(); err != nil {
		return nil, writeGovernanceError("iterate users", err)
	}
	return names, nil
}

func rowNotFound(err error) bool {
	return err == pgx.ErrNoRows
}
