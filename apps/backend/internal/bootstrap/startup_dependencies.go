package bootstrap

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

const startupDependencyProbeTimeout = 3 * time.Second

/**
 * verifyStartupDependencies proves the canonical source-based startup path can
 * reach the real PostgreSQL and Redis dependencies before the HTTP runtime
 * starts serving traffic.
 */
func verifyStartupDependencies(cfg Config) error {
	ctx, cancel := context.WithTimeout(context.Background(), startupDependencyProbeTimeout)
	defer cancel()

	if err := probePostgres(ctx, cfg.Database.PrimaryDSN); err != nil {
		return err
	}
	if err := probeRedis(ctx, cfg.Redis.Address); err != nil {
		return err
	}

	return nil
}

/**
 * probePostgres opens a pgx pool from `DATABASE_URL` and requires a successful
 * ping so bootstrap cannot silently accept an unusable datasource.
 */
func probePostgres(ctx context.Context, dsn string) error {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return fmt.Errorf("connect postgres via DATABASE_URL: %w", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("ping postgres via DATABASE_URL: %w", err)
	}

	return nil
}

/**
 * probeRedis parses `REDIS_URL` with the official Redis client and requires a
 * successful ping before startup continues.
 */
func probeRedis(ctx context.Context, address string) error {
	options, err := redis.ParseURL(address)
	if err != nil {
		return fmt.Errorf("parse REDIS_URL: %w", err)
	}

	client := redis.NewClient(options)
	defer client.Close()

	if err := client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("ping redis via REDIS_URL: %w", err)
	}

	return nil
}
