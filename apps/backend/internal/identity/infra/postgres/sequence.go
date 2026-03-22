package postgres

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Sequence struct {
	pool *pgxpool.Pool
}

func NewSequence(pool *pgxpool.Pool) *Sequence {
	return &Sequence{pool: pool}
}

func (sequence *Sequence) NextUserID() (int64, error) {
	var nextUserID int64
	if err := sequence.pool.QueryRow(context.Background(), `
		select nextval(pg_get_serial_sequence('identity_users', 'id'))
	`).Scan(&nextUserID); err != nil {
		return 0, fmt.Errorf("next identity user id: %w", err)
	}
	return nextUserID, nil
}

func (sequence *Sequence) NextSessionID() (string, error) {
	value, err := randomHex(16)
	if err != nil {
		return "", err
	}
	return "session-" + value, nil
}

func (sequence *Sequence) NextAPIToken() (string, error) {
	value, err := randomHex(16)
	if err != nil {
		return "", err
	}
	return "api-token-" + value, nil
}

func randomHex(size int) (string, error) {
	buffer := make([]byte, size)
	if _, err := rand.Read(buffer); err != nil {
		return "", fmt.Errorf("generate secure random bytes: %w", err)
	}
	return hex.EncodeToString(buffer), nil
}
