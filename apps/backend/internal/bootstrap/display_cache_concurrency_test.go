package bootstrap

import (
	"context"
	"fmt"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/platform"
)

func TestDisplayCacheDiscardsRefillOverlappingInvalidation(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	reader, err := platform.NewRedisClient("redis://127.0.0.1:6379/0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = reader.Close() })
	writer, err := platform.NewRedisClient("redis://127.0.0.1:6379/0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = writer.Close() })
	key := fmt.Sprintf("test:display-refill:%d", time.Now().UnixNano())
	t.Cleanup(func() { _ = writer.Del(context.Background(), key) })

	started := make(chan struct{})
	resume := make(chan struct{})
	overlap := make(chan string, 1)
	go func() {
		value, _, _ := platform.CacheAsidePositive(reader, ctx, key, time.Minute, func() (string, bool, error) {
			close(started)
			select {
			case <-resume:
			case <-ctx.Done():
			}
			return "before commit", true, nil
		})
		overlap <- value
	}()
	select {
	case <-started:
	case <-ctx.Done():
		t.Fatal(ctx.Err())
	}
	if err := writer.InvalidateDisplay(ctx, key); err != nil {
		t.Fatal(err)
	}
	close(resume)
	select {
	case value := <-overlap:
		if value != "before commit" {
			t.Fatalf("overlapping read = %q", value)
		}
	case <-ctx.Done():
		t.Fatal(ctx.Err())
	}
	if hit, err := reader.Get(ctx, key, new(string)); hit || err != nil {
		t.Fatalf("overlapping refill was published: hit=%v, err=%v", hit, err)
	}
	value, found, err := platform.CacheAsidePositive(reader, ctx, key, time.Minute, func() (string, bool, error) {
		return "after commit", true, nil
	})
	if value != "after commit" || !found || err != nil {
		t.Fatalf("post-commit read = %q, %v, %v", value, found, err)
	}
}
