package platform

import (
	"sync"

	platformconfig "opentoggl/backend/apps/backend/internal/platform/config"
)

// Services is a small compile-time boundary marker for the composition root.
// apps/backend only needs to know it received platform services, not how later
// slices implement the underlying adapters.
type Services interface {
	services()
}

type Runtime struct {
	Database  DatabaseHandle
	Redis     RedisHandle
	FileStore *MemoryFileStore
	Jobs      *JobRunner
}

func NewRuntime(cfg platformconfig.RuntimeConfig) *Runtime {
	return &Runtime{
		Database: DatabaseHandle{
			primaryDSN: cfg.Database.PrimaryDSN,
		},
		Redis: RedisHandle{
			address: cfg.Redis.Address,
		},
		FileStore: &MemoryFileStore{
			namespace: cfg.FileStore.Namespace,
			files:     make(map[string][]byte),
		},
		Jobs: &JobRunner{
			queueName: cfg.Jobs.QueueName,
			jobs:      make(map[string]JobDefinition),
		},
	}
}

func (*Runtime) services() {}

type DatabaseHandle struct {
	primaryDSN string
}

func (db DatabaseHandle) PrimaryDSN() string {
	return db.primaryDSN
}

type RedisHandle struct {
	address string
}

func (redis RedisHandle) Address() string {
	return redis.address
}

// MemoryFileStore keeps Wave 0 storage behavior observable in tests without
// inventing a second abstraction layer before the real adapter exists.
type MemoryFileStore struct {
	namespace string
	mu        sync.RWMutex
	files     map[string][]byte
}

func (store *MemoryFileStore) Namespace() string {
	return store.namespace
}

func (store *MemoryFileStore) Put(path string, contents []byte) {
	store.mu.Lock()
	defer store.mu.Unlock()

	store.files[path] = append([]byte(nil), contents...)
}

func (store *MemoryFileStore) Get(path string) ([]byte, bool) {
	store.mu.RLock()
	defer store.mu.RUnlock()

	contents, ok := store.files[path]
	if !ok {
		return nil, false
	}

	return append([]byte(nil), contents...), true
}
