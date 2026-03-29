package platform

import (
	"context"

	platformconfig "opentoggl/backend/apps/backend/internal/platform/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Services is a small compile-time boundary marker for the composition root.
// apps/backend only needs to know it received platform services, not how later
// slices implement the underlying adapters.
type Services interface {
	services()
}

type Handles struct {
	Database  DatabaseHandle
	Redis     RedisHandle
	Cache     *RedisClient
	FileStore FileStoreHandle
	Jobs      *JobRunner
}

func NewHandles(cfg platformconfig.StartupConfig) *Handles {
	database, err := NewDatabaseHandle(cfg.Database.PrimaryDSN)
	if err != nil {
		panic(err)
	}

	cache, err := NewRedisClient(cfg.Redis.Address)
	if err != nil {
		panic(err)
	}

	return &Handles{
		Database: database,
		Redis: RedisHandle{
			address: cfg.Redis.Address,
		},
		Cache: cache,
		FileStore: FileStoreHandle{
			namespace: cfg.FileStore.Namespace,
		},
		Jobs: &JobRunner{
			queueName: cfg.Jobs.QueueName,
			jobs:      make(map[string]JobDefinition),
		},
	}
}

func (*Handles) services() {}

type DatabaseHandle struct {
	primaryDSN string
	pool       *pgxpool.Pool
}

func NewDatabaseHandle(primaryDSN string) (DatabaseHandle, error) {
	pool, err := pgxpool.New(context.Background(), primaryDSN)
	if err != nil {
		return DatabaseHandle{}, err
	}

	return DatabaseHandle{
		primaryDSN: primaryDSN,
		pool:       pool,
	}, nil
}

func (db DatabaseHandle) PrimaryDSN() string {
	return db.primaryDSN
}

func (db DatabaseHandle) Pool() *pgxpool.Pool {
	return db.pool
}

func (db DatabaseHandle) Close() {
	if db.pool != nil {
		db.pool.Close()
	}
}

type RedisHandle struct {
	address string
}

func (redis RedisHandle) Address() string {
	return redis.address
}

// FileStoreHandle exposes the configured filestore namespace to the
// composition root without fabricating an in-memory content store as the
// default production path.
type FileStoreHandle struct {
	namespace string
}

func (store FileStoreHandle) Namespace() string {
	return store.namespace
}
