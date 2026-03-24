package testsupport

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"
)

// DefaultTestQueueName is the canonical queue name for backend tests.
// Set OPENTOGGL_JOBS_QUEUE_NAME=test when running backend tests to ensure
// test jobs are isolated from production job flows.
const DefaultTestQueueName = "test"

// TestQueueConfig holds the async test configuration.
type TestQueueConfig struct {
	queueName string
}

// NewTestQueueConfig returns a TestQueueConfig from environment or defaults.
func NewTestQueueConfig() TestQueueConfig {
	queueName := os.Getenv("OPENTOGGL_JOBS_QUEUE_NAME")
	if strings.TrimSpace(queueName) == "" {
		queueName = DefaultTestQueueName
	}
	return TestQueueConfig{
		queueName: queueName,
	}
}

// QueueName returns the configured queue name.
func (c TestQueueConfig) QueueName() string {
	return c.queueName
}

// IsTestQueue reports whether the given queue name is a test-owned queue.
func (c TestQueueConfig) IsTestQueue(queueName string) bool {
	return queueName == c.queueName || queueName == DefaultTestQueueName
}

// DrainContext returns a context that cancels after the specified duration.
// Use this to set a timeout when draining async jobs.
func DrainContext(timeout time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), timeout)
}

// DefaultDrainTimeout is the default timeout for draining async jobs.
const DefaultDrainTimeout = 5 * time.Second

// DrainHelper provides utilities for waiting on async job completion in tests.
type DrainHelper struct {
	t       *testing.T
	timeout time.Duration
}

// NewDrainHelper creates a DrainHelper with the default drain timeout.
func NewDrainHelper(t *testing.T) *DrainHelper {
	return &DrainHelper{
		t:       t,
		timeout: DefaultDrainTimeout,
	}
}

// NewDrainHelperWithTimeout creates a DrainHelper with a custom timeout.
func NewDrainHelperWithTimeout(t *testing.T, timeout time.Duration) *DrainHelper {
	return &DrainHelper{
		t:       t,
		timeout: timeout,
	}
}

// WaitForIdle waits for the async system to reach idle state by repeatedly
// checking until the check function returns true, or the timeout expires.
// The check function should return true when no more in-flight work exists.
func (h *DrainHelper) WaitForIdle(ctx context.Context, check func() bool) bool {
	h.t.Helper()

	deadline, ok := ctx.Deadline()
	if !ok {
		deadline = time.Now().Add(h.timeout)
	}

	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return false
		case <-ticker.C:
			if check() {
				return true
			}
			if time.Now().After(deadline) {
				return false
			}
		}
	}
}

// WaitForIdleWithTimeout is a convenience method that creates a drain context
// with the default timeout and waits for idle.
func (h *DrainHelper) WaitForIdleWithTimeout(check func() bool) bool {
	h.t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), h.timeout)
	defer cancel()

	return h.WaitForIdle(ctx, check)
}
