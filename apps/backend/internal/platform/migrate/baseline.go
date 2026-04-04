package migrate

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	"github.com/pressly/goose/v3"
)

func bridgeBaseline(ctx context.Context, db *sql.DB) error {
	gooseTableExists, err := tableExists(ctx, db, "goose_db_version")
	if err != nil {
		return fmt.Errorf("check goose table: %w", err)
	}
	if gooseTableExists {
		return nil
	}

	hasExistingSchema, err := tableExists(ctx, db, "identity_users")
	if err != nil {
		return fmt.Errorf("check existing schema: %w", err)
	}
	if !hasExistingSchema {
		return nil
	}

	slog.Info("existing database detected, bridging baseline migration")

	if _, err := goose.EnsureDBVersionContext(ctx, db); err != nil {
		return fmt.Errorf("create goose version table: %w", err)
	}

	const insertBaseline = `INSERT INTO goose_db_version (version_id, is_applied, tstamp)
		VALUES (1, true, $1)
		ON CONFLICT DO NOTHING`
	if _, err := db.ExecContext(ctx, insertBaseline, time.Now()); err != nil {
		return fmt.Errorf("insert baseline record: %w", err)
	}

	slog.Info("baseline migration marked as applied for existing database")
	return nil
}

func tableExists(ctx context.Context, db *sql.DB, tableName string) (bool, error) {
	var exists bool
	err := db.QueryRowContext(ctx,
		`SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = current_schema() AND table_name = $1
		)`, tableName).Scan(&exists)
	return exists, err
}
