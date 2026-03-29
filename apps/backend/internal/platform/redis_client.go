package platform

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

// RedisClient wraps the official Redis client with JSON serialization,
// a generic cache-aside helper, and singleflight deduplication.
type RedisClient struct {
	client *redis.Client
	flight singleflight.Group
}

// NewRedisClient creates a shared Redis client from the configured REDIS_URL.
// Connectivity is not verified here — startup dependency probing is handled
// separately by verifyStartupDependencies / probeRedis in bootstrap.
func NewRedisClient(address string) (*RedisClient, error) {
	options, err := redis.ParseURL(address)
	if err != nil {
		return nil, fmt.Errorf("parse REDIS_URL: %w", err)
	}
	return &RedisClient{client: redis.NewClient(options)}, nil
}

func (rc *RedisClient) Close() error {
	return rc.client.Close()
}

// Get retrieves a cached value and JSON-unmarshals it into dest.
// Returns false on cache miss. Redis errors are treated as misses.
func (rc *RedisClient) Get(ctx context.Context, key string, dest any) (bool, error) {
	val, err := rc.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if err := json.Unmarshal(val, dest); err != nil {
		return false, err
	}
	return true, nil
}

// Set JSON-marshals value and stores it with the given TTL.
func (rc *RedisClient) Set(ctx context.Context, key string, value any, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return rc.client.Set(ctx, key, data, ttl).Err()
}

// Del removes one or more keys.
func (rc *RedisClient) Del(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	return rc.client.Del(ctx, keys...).Err()
}

// CacheAside implements the cache-aside (read-through) pattern with generics.
//
//   - On Redis hit → return cached value (no DB call).
//   - On Redis miss → singleflight deduplicates concurrent fetches for the
//     same key within this process, so only one goroutine calls fetch.
//   - Redis errors are silently treated as misses.
func CacheAside[T any](rc *RedisClient, ctx context.Context, key string, ttl time.Duration, fetch func() (T, error)) (T, error) {
	var cached T
	if found, err := rc.Get(ctx, key, &cached); err == nil && found {
		return cached, nil
	}

	type result struct {
		Value T
		Err   error
	}

	val, _, _ := rc.flight.Do(key, func() (any, error) {
		v, fetchErr := fetch()
		return result{Value: v, Err: fetchErr}, nil
	})

	r := val.(result)
	if r.Err != nil {
		return r.Value, r.Err
	}

	_ = rc.Set(ctx, key, r.Value, ttl)
	return r.Value, nil
}
