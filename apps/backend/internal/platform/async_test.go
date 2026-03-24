package platform

import (
	"context"
	"os"
	"sync"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/testsupport"
)

// TestQueueConfigAndDrainHelperIntegration demonstrates concrete usage of async
// test helpers (TestQueueConfig and DrainHelper) in a test scenario. This test
// proves that the async guardrails are implemented, not only documented.
//
// The test simulates async work with a goroutine and uses DrainHelper to wait
// for the work to complete before asserting results. This pattern is essential
// for tests that enqueue async work (like import jobs, export jobs, or any
// background processing) where assertions must wait for settled state.
func TestQueueConfigAndDrainHelperIntegration(t *testing.T) {
	// Use TestQueueConfig to get the test-owned queue prefix
	// This ensures test jobs are isolated from production job flows
	cfg := testsupport.NewTestQueueConfig()
	queueName := cfg.QueueName()

	// Verify the queue name defaults to "test" when not overridden
	if queueName != testsupport.DefaultTestQueueName {
		t.Fatalf("expected default test queue name %q, got %q", testsupport.DefaultTestQueueName, queueName)
	}

	// Verify IsTestQueue correctly identifies test-owned queues
	if !cfg.IsTestQueue(queueName) {
		t.Fatalf("expected queue %q to be identified as a test queue", queueName)
	}
	if cfg.IsTestQueue("production") {
		t.Fatal("expected 'production' queue to not be identified as a test queue")
	}

	// Simulate async work completion tracking
	var wg sync.WaitGroup
	wg.Add(1)

	workCompleted := false
	var workMutex sync.Mutex

	// Simulate async work with a goroutine (like a real async queue would do)
	go func() {
		defer wg.Done()
		time.Sleep(50 * time.Millisecond) // Simulate work
		workMutex.Lock()
		workCompleted = true
		workMutex.Unlock()
	}()

	// Use DrainHelper to wait for the async work to reach idle state
	// This is the critical pattern for async-sensitive tests: drain to idle
	// before making assertions to ensure we're testing settled state.
	drainHelper := testsupport.NewDrainHelper(t)

	// Create a context with timeout for the drain operation
	ctx, cancel := testsupport.DrainContext(5 * time.Second)
	defer cancel()

	// WaitForIdle polls until the check function returns true or timeout expires
	idle := drainHelper.WaitForIdle(ctx, func() bool {
		workMutex.Lock()
		defer workMutex.Unlock()
		return workCompleted
	})

	if !idle {
		t.Fatal("expected async work to complete within drain timeout")
	}

	// Now that work is drained, we can safely assert
	workMutex.Lock()
	if !workCompleted {
		t.Fatal("expected work to be completed after drain")
	}
	workMutex.Unlock()

	// Wait for goroutine to fully clean up
	wg.Wait()
}

// TestDrainHelperWithTimeout demonstrates the convenience method for
// simple timeout-based draining without explicit context management.
func TestDrainHelperWithTimeout(t *testing.T) {
	drainHelper := testsupport.NewDrainHelperWithTimeout(t, 2*time.Second)

	// Create a channel that closes after a short delay
	done := make(chan struct{})
	go func() {
		time.Sleep(30 * time.Millisecond)
		close(done)
	}()

	// Use WaitForIdleWithTimeout for simple cases
	idle := drainHelper.WaitForIdleWithTimeout(func() bool {
		select {
		case <-done:
			return true
		default:
			return false
		}
	})

	if !idle {
		t.Fatal("expected channel to be done within timeout")
	}
}

// TestDrainHelperTimeoutExceeded demonstrates that WaitForIdle correctly
// times out when work doesn't complete.
func TestDrainHelperTimeoutExceeded(t *testing.T) {
	// Use a very short timeout to simulate timeout scenario
	drainHelper := testsupport.NewDrainHelperWithTimeout(t, 10*time.Millisecond)

	// This check function always returns false (work never completes)
	idle := drainHelper.WaitForIdleWithTimeout(func() bool {
		return false // Never reaches idle
	})

	if idle {
		t.Fatal("expected WaitForIdleWithTimeout to return false when work doesn't complete")
	}
}

// TestQueueConfigEnvironmentOverride demonstrates that the queue prefix
// can be overridden via environment variable, which is essential for
// CI/CD scenarios where test jobs need explicit queue isolation.
func TestQueueConfigEnvironmentOverride(t *testing.T) {
	// Save original value and restore after test
	original := os.Getenv("OPENTOGGL_JOBS_QUEUE_NAME")
	t.Setenv("OPENTOGGL_JOBS_QUEUE_NAME", "ci-runner-42")
	defer func() {
		if original == "" {
			os.Unsetenv("OPENTOGGL_JOBS_QUEUE_NAME")
		} else {
			os.Setenv("OPENTOGGL_JOBS_QUEUE_NAME", original)
		}
	}()

	// After setting env var, NewTestQueueConfig should pick it up
	cfg := testsupport.NewTestQueueConfig()
	if cfg.QueueName() != "ci-runner-42" {
		t.Fatalf("expected queue name to be overridden to 'ci-runner-42', got %q", cfg.QueueName())
	}
}

// TestJobRunnerWithTestQueueConfig demonstrates using the test queue config
// with the JobRunner to ensure job isolation during tests.
func TestJobRunnerWithTestQueueConfig(t *testing.T) {
	// Get the test queue configuration
	cfg := testsupport.NewTestQueueConfig()

	// Create a JobRunner with the test queue name
	runner := &JobRunner{
		queueName: cfg.QueueName(),
		jobs:      make(map[string]JobDefinition),
	}

	// Verify the runner uses the test queue
	if runner.QueueName() != cfg.QueueName() {
		t.Fatalf("expected runner queue name %q, got %q", cfg.QueueName(), runner.QueueName())
	}

	// Register and run a test job
	jobRan := false
	err := runner.Register(JobDefinition{
		Name: "test.async.job",
		Run: func(ctx context.Context, job Job) error {
			jobRan = true
			return nil
		},
	})
	if err != nil {
		t.Fatalf("expected job registration to succeed: %v", err)
	}

	err = runner.RunOnce(context.Background(), Job{Name: "test.async.job"})
	if err != nil {
		t.Fatalf("expected job run to succeed: %v", err)
	}

	if !jobRan {
		t.Fatal("expected test job to have run")
	}
}

// TestJobRunnerWithDrainHelper demonstrates concrete usage of the async test
// helpers (TestQueueConfig, JobRunner, and DrainHelper) in a real async-sensitive
// backend flow. This test proves that the async guardrails are wired together,
// not only demonstrated in isolation.
//
// The test uses the real JobRunner component with test queue configuration and
// demonstrates drain-to-idle behavior for async-sensitive backend paths.
func TestJobRunnerWithDrainHelper(t *testing.T) {
	// Use TestQueueConfig to get the test-owned queue prefix
	// This ensures test jobs are isolated from production job flows
	cfg := testsupport.NewTestQueueConfig()
	queueName := cfg.QueueName()

	// Verify the queue name defaults to "test" when not overridden
	if queueName != testsupport.DefaultTestQueueName {
		t.Fatalf("expected default test queue name %q, got %q", testsupport.DefaultTestQueueName, queueName)
	}

	// Create a JobRunner with the test queue name
	runner := &JobRunner{
		queueName: cfg.QueueName(),
		jobs:      make(map[string]JobDefinition),
	}

	// Verify the runner uses the test queue
	if runner.QueueName() != cfg.QueueName() {
		t.Fatalf("expected runner queue name %q, got %q", cfg.QueueName(), runner.QueueName())
	}

	// Verify IsTestQueue correctly identifies test-owned queues
	if !cfg.IsTestQueue(runner.QueueName()) {
		t.Fatalf("expected runner queue %q to be identified as a test queue", runner.QueueName())
	}

	// Track work completion state
	var wg sync.WaitGroup
	wg.Add(1)
	workCompleted := false
	var workMutex sync.Mutex

	// Register a test job that simulates async work with a delay
	err := runner.Register(JobDefinition{
		Name: "test.async.drain.job",
		Run: func(ctx context.Context, job Job) error {
			// Simulate async work with a delay (like real background processing)
			go func() {
				defer wg.Done()
				time.Sleep(50 * time.Millisecond)
				workMutex.Lock()
				workCompleted = true
				workMutex.Unlock()
			}()
			return nil
		},
	})
	if err != nil {
		t.Fatalf("expected job registration to succeed: %v", err)
	}

	// Start the job (simulating async enqueue)
	err = runner.RunOnce(context.Background(), Job{Name: "test.async.drain.job"})
	if err != nil {
		t.Fatalf("expected job run to succeed: %v", err)
	}

	// Use DrainHelper to wait for the async work to reach idle state
	// This is the critical pattern for async-sensitive tests: drain to idle
	// before making assertions to ensure we're testing settled state.
	drainHelper := testsupport.NewDrainHelper(t)

	// Create a context with timeout for the drain operation
	ctx, cancel := testsupport.DrainContext(5 * time.Second)
	defer cancel()

	// WaitForIdle polls until the check function returns true or timeout expires
	idle := drainHelper.WaitForIdle(ctx, func() bool {
		workMutex.Lock()
		defer workMutex.Unlock()
		return workCompleted
	})

	if !idle {
		t.Fatal("expected async work to complete within drain timeout")
	}

	// Now that work is drained, we can safely assert
	workMutex.Lock()
	if !workCompleted {
		t.Fatal("expected work to be completed after drain")
	}
	workMutex.Unlock()

	// Wait for goroutine to fully clean up
	wg.Wait()
}
