package platform

import (
	"context"
	"errors"
	"fmt"
	"sync"
)

type Job struct {
	Name string
}

type JobDefinition struct {
	Name string
	Run  func(context.Context, Job) error
}

// JobRunner is intentionally tiny: Wave 0 only needs shared registration and a
// deterministic single-shot executor so bootstrap tests can pin the boundary.
type JobRunner struct {
	queueName string
	mu        sync.RWMutex
	jobs      map[string]JobDefinition
}

func (runner *JobRunner) QueueName() string {
	return runner.queueName
}

func (runner *JobRunner) Register(definition JobDefinition) error {
	if definition.Name == "" {
		return errors.New("job definition name is required")
	}
	if definition.Run == nil {
		return errors.New("job definition handler is required")
	}

	runner.mu.Lock()
	defer runner.mu.Unlock()

	if _, exists := runner.jobs[definition.Name]; exists {
		return fmt.Errorf("job definition %q already registered", definition.Name)
	}

	runner.jobs[definition.Name] = definition
	return nil
}

func (runner *JobRunner) RunOnce(ctx context.Context, job Job) error {
	runner.mu.RLock()
	definition, ok := runner.jobs[job.Name]
	runner.mu.RUnlock()
	if !ok {
		return fmt.Errorf("job definition %q not registered", job.Name)
	}

	return definition.Run(ctx, job)
}
