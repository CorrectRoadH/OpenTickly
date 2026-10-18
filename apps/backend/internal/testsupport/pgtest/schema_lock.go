package pgtest

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5"
)

// Keep a dedicated physical connection for the session-level lock. Closing it
// releases the lock even when schema setup fails; it must never return to a pool.
func lockSchema(t *testing.T, dsn string, schema string) func() {
	t.Helper()
	ctx := t.Context()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("connect schema lock: %v", err)
	}
	release := func() {
		if err := conn.Close(context.Background()); err != nil {
			t.Errorf("close schema lock connection: %v", err)
		}
	}
	if _, err := conn.Exec(ctx, "select pg_advisory_lock(hashtextextended($1, 0))", "opentickly:pgtest:"+schema); err != nil {
		release()
		t.Fatalf("lock test schema %s: %v", schema, err)
	}
	return release
}
