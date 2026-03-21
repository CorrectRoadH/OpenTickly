package web

import (
	"context"
	"net"
	"testing"
	"time"
)

func TestRuntimeReadinessProbeReportsReadyWhenDependenciesAcceptTCPConnections(t *testing.T) {
	postgresListener := mustListenTCP(t)
	defer postgresListener.Close()

	redisListener := mustListenTCP(t)
	defer redisListener.Close()

	probe := NewRuntimeReadinessProbe(RuntimeReadinessConfig{
		Service:     "opentoggl",
		DatabaseURL: "postgres://opentoggl@" + postgresListener.Addr().String() + "/opentoggl",
		RedisURL:    "redis://" + redisListener.Addr().String() + "/0",
		Timeout:     100 * time.Millisecond,
	})

	report := probe.Check(context.Background())

	if report.Status != StatusOK {
		t.Fatalf("expected readiness status ok, got %#v", report)
	}

	if len(report.Checks) != 3 {
		t.Fatalf("expected 3 readiness checks, got %d", len(report.Checks))
	}

	for _, check := range report.Checks {
		if check.Status != StatusOK {
			t.Fatalf("expected readiness check %q to be ok, got %#v", check.Name, check)
		}
	}
}

func TestRuntimeReadinessProbeReportsDependencyFailures(t *testing.T) {
	closedListener := mustListenTCP(t)
	closedAddress := closedListener.Addr().String()
	closedListener.Close()

	probe := NewRuntimeReadinessProbe(RuntimeReadinessConfig{
		Service:     "opentoggl",
		DatabaseURL: "postgres://opentoggl@" + closedAddress + "/opentoggl",
		RedisURL:    "redis://bad redis target",
		Timeout:     100 * time.Millisecond,
	})

	report := probe.Check(context.Background())

	if report.Status != StatusError {
		t.Fatalf("expected readiness status error, got %#v", report)
	}

	if report.Checks[1].Status != StatusError {
		t.Fatalf("expected postgres readiness failure, got %#v", report.Checks[1])
	}

	if report.Checks[2].Status != StatusError {
		t.Fatalf("expected redis readiness failure, got %#v", report.Checks[2])
	}
}

func mustListenTCP(t *testing.T) net.Listener {
	t.Helper()

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("expected tcp listener to start: %v", err)
	}

	return listener
}
