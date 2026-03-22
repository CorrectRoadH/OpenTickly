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

func (sequence *Sequence) NextUserID() int64 {
	var nextUserID int64
	if err := sequence.pool.QueryRow(context.Background(), `
		select nextval('identity_user_id_seq')
	`).Scan(&nextUserID); err != nil {
		panic(fmt.Errorf("next identity user id: %w", err))
	}
	return nextUserID
}

func (sequence *Sequence) NextSessionID() string {
	return "session-" + randomHex(16)
}

func (sequence *Sequence) NextAPIToken() string {
	return "api-token-" + randomHex(16)
}

func randomHex(size int) string {
	buffer := make([]byte, size)
	if _, err := rand.Read(buffer); err != nil {
		panic(fmt.Errorf("generate secure random bytes: %w", err))
	}
	return hex.EncodeToString(buffer)
}
