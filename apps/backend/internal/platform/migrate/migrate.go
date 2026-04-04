package migrate

import (
	"context"
	"embed"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func Run(ctx context.Context, pool *pgxpool.Pool) error {
	db := stdlib.OpenDBFromPool(pool)

	goose.SetBaseFS(migrationsFS)
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("goose dialect: %w", err)
	}

	if err := bridgeBaseline(ctx, db); err != nil {
		return fmt.Errorf("goose baseline bridge: %w", err)
	}

	current, err := goose.GetDBVersionContext(ctx, db)
	if err != nil {
		return fmt.Errorf("goose get version: %w", err)
	}
	slog.Info("database migration check", "current_version", current)

	if err := goose.UpContext(ctx, db, "migrations"); err != nil {
		return fmt.Errorf("goose up: %w", err)
	}

	after, err := goose.GetDBVersionContext(ctx, db)
	if err != nil {
		return fmt.Errorf("goose get version after: %w", err)
	}
	if after != current {
		slog.Info("database migrated", "from_version", current, "to_version", after)
	} else {
		slog.Info("database up to date", "version", after)
	}

	return nil
}

func Status(ctx context.Context, pool *pgxpool.Pool) error {
	db := stdlib.OpenDBFromPool(pool)

	goose.SetBaseFS(migrationsFS)
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("goose dialect: %w", err)
	}

	return goose.StatusContext(ctx, db, "migrations")
}
