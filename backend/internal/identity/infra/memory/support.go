package memory

import (
	"context"
	"fmt"
	"sync"

	"opentoggl/backend/backend/internal/identity/application"
)

type JobRecorder struct {
	mu   sync.RWMutex
	jobs []application.JobRecord
}

func NewJobRecorder() *JobRecorder {
	return &JobRecorder{}
}

func (recorder *JobRecorder) Record(_ context.Context, job application.JobRecord) error {
	recorder.mu.Lock()
	defer recorder.mu.Unlock()

	recorder.jobs = append(recorder.jobs, job)
	return nil
}

func (recorder *JobRecorder) Recorded() []application.JobRecord {
	recorder.mu.RLock()
	defer recorder.mu.RUnlock()

	return append([]application.JobRecord(nil), recorder.jobs...)
}

type TimerState struct {
	mu      sync.RWMutex
	running map[int64]bool
}

func NewTimerState() *TimerState {
	return &TimerState{
		running: make(map[int64]bool),
	}
}

func (state *TimerState) MarkRunning(userID int64) {
	state.mu.Lock()
	defer state.mu.Unlock()

	state.running[userID] = true
}

func (state *TimerState) HasRunningTimer(_ context.Context, userID int64) (bool, error) {
	state.mu.RLock()
	defer state.mu.RUnlock()

	return state.running[userID], nil
}

type Sequence struct {
	mu           sync.Mutex
	nextUserID   int64
	nextSession  int64
	nextAPIToken int64
}

func NewSequence() *Sequence {
	return &Sequence{
		nextUserID:   1,
		nextSession:  1,
		nextAPIToken: 1,
	}
}

func (sequence *Sequence) NextUserID() int64 {
	sequence.mu.Lock()
	defer sequence.mu.Unlock()

	value := sequence.nextUserID
	sequence.nextUserID++
	return value
}

func (sequence *Sequence) NextSessionID() string {
	sequence.mu.Lock()
	defer sequence.mu.Unlock()

	value := fmt.Sprintf("session-%d", sequence.nextSession)
	sequence.nextSession++
	return value
}

func (sequence *Sequence) NextAPIToken() string {
	sequence.mu.Lock()
	defer sequence.mu.Unlock()

	value := fmt.Sprintf("api-token-%d", sequence.nextAPIToken)
	sequence.nextAPIToken++
	return value
}
