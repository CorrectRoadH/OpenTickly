package application_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/telemetry/application"
	"opentoggl/backend/apps/backend/internal/telemetry/domain"

	"github.com/google/uuid"
)

type fakeStore struct {
	id  domain.InstanceID
	err error
}

func (f *fakeStore) GetInstanceID(_ context.Context) (domain.InstanceID, error) {
	return f.id, f.err
}

type fakeClient struct {
	mu       sync.Mutex
	calls    int
	payloads []domain.CheckinPayload
	reply    domain.Manifest
	err      error
}

func (f *fakeClient) FetchManifest(_ context.Context, payload domain.CheckinPayload) (domain.Manifest, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls++
	f.payloads = append(f.payloads, payload)
	if f.err != nil {
		return domain.Manifest{}, f.err
	}
	return f.reply, nil
}

func (f *fakeClient) callCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.calls
}

type staticBuildInfo struct{}

func (staticBuildInfo) Version() string   { return "0.1.0" }
func (staticBuildInfo) GoVersion() string { return "go1.25.0" }
func (staticBuildInfo) OS() string        { return "linux" }
func (staticBuildInfo) Arch() string      { return "amd64" }

func newID(t *testing.T) domain.InstanceID {
	t.Helper()
	u, err := uuid.NewRandom()
	if err != nil {
		t.Fatalf("uuid.NewRandom: %v", err)
	}
	return domain.InstanceID(u)
}

func newTestPinger(t *testing.T, store application.InstanceIDStore, client application.ManifestClient) *application.Pinger {
	t.Helper()
	p, err := application.NewPinger(application.Config{
		Store:     store,
		Client:    client,
		BuildInfo: staticBuildInfo{},
		Interval:  20 * time.Millisecond,
		MaxJitter: 1, // effectively no jitter — trigger the first ping immediately
		Logger:    slog.New(slog.NewTextHandler(io.Discard, nil)),
	})
	if err != nil {
		t.Fatalf("NewPinger: %v", err)
	}
	return p
}

func TestSendOnce_ForwardsBuildInfoAndInstanceID(t *testing.T) {
	id := newID(t)
	store := &fakeStore{id: id}
	client := &fakeClient{reply: domain.Manifest{LatestTag: "0.2.0", LatestVersion: "0.2.0"}}

	p := newTestPinger(t, store, client)

	manifest, err := p.SendOnce(context.Background())
	if err != nil {
		t.Fatalf("SendOnce: %v", err)
	}
	if manifest.LatestTag != "0.2.0" {
		t.Fatalf("got LatestTag %q", manifest.LatestTag)
	}
	if len(client.payloads) != 1 {
		t.Fatalf("expected 1 payload, got %d", len(client.payloads))
	}
	p0 := client.payloads[0]
	if p0.InstanceID != id {
		t.Fatalf("instance id mismatch: got %v want %v", p0.InstanceID, id)
	}
	if p0.Version != "0.1.0" || p0.OS != "linux" || p0.Arch != "amd64" {
		t.Fatalf("build info not forwarded: %+v", p0)
	}
}

func TestSendOnce_CachesLatestManifest(t *testing.T) {
	store := &fakeStore{id: newID(t)}
	client := &fakeClient{reply: domain.Manifest{LatestTag: "9.9.9", LatestVersion: "9.9.9"}}
	p := newTestPinger(t, store, client)

	if _, ok := p.LatestManifest(); ok {
		t.Fatalf("expected no cached manifest before SendOnce")
	}
	if _, err := p.SendOnce(context.Background()); err != nil {
		t.Fatalf("SendOnce: %v", err)
	}
	cached, ok := p.LatestManifest()
	if !ok || cached.LatestTag != "9.9.9" {
		t.Fatalf("cached manifest not populated: ok=%v cached=%+v", ok, cached)
	}
}

func TestSendOnce_StoreErrorPropagates(t *testing.T) {
	store := &fakeStore{err: errors.New("boom")}
	client := &fakeClient{}
	p := newTestPinger(t, store, client)

	_, err := p.SendOnce(context.Background())
	if err == nil {
		t.Fatalf("expected error from store")
	}
	if client.callCount() != 0 {
		t.Fatalf("client must not be called when store fails")
	}
}

func TestRun_StopsOnContextCancel(t *testing.T) {
	store := &fakeStore{id: newID(t)}
	client := &fakeClient{reply: domain.Manifest{LatestTag: "0.1.0"}}
	p := newTestPinger(t, store, client)

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		p.Run(ctx)
		close(done)
	}()

	// wait until at least one ping lands, so we know the loop is alive
	deadline := time.Now().Add(500 * time.Millisecond)
	for client.callCount() == 0 && time.Now().Before(deadline) {
		time.Sleep(5 * time.Millisecond)
	}
	cancel()

	select {
	case <-done:
	case <-time.After(500 * time.Millisecond):
		t.Fatalf("Run did not return after context cancel")
	}
}

func TestRun_KeepsPingingDespiteClientErrors(t *testing.T) {
	store := &fakeStore{id: newID(t)}
	errsLeft := int32(3)
	client := &fakeClient{reply: domain.Manifest{LatestTag: "0.1.0"}}
	// flaky: first three calls error out
	flakyClient := &flakyClient{inner: client, errsLeft: &errsLeft}

	p := newTestPinger(t, store, flakyClient)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go p.Run(ctx)

	deadline := time.Now().Add(500 * time.Millisecond)
	for flakyClient.totalCalls() < 5 && time.Now().Before(deadline) {
		time.Sleep(5 * time.Millisecond)
	}
	if flakyClient.totalCalls() < 5 {
		t.Fatalf("expected >= 5 calls, got %d", flakyClient.totalCalls())
	}
}

type flakyClient struct {
	inner    *fakeClient
	errsLeft *int32
	mu       sync.Mutex
	total    int
}

func (f *flakyClient) FetchManifest(ctx context.Context, payload domain.CheckinPayload) (domain.Manifest, error) {
	f.mu.Lock()
	f.total++
	f.mu.Unlock()
	if atomic.AddInt32(f.errsLeft, -1) >= 0 {
		return domain.Manifest{}, errors.New("transient")
	}
	return f.inner.FetchManifest(ctx, payload)
}

func (f *flakyClient) totalCalls() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.total
}
