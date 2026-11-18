package bootstrap

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"sync"
	"testing"
	"time"

	"github.com/labstack/echo/v5"
)

func TestAppStartPropagatesListenError(t *testing.T) {
	listener := newTestListener(t)
	app := &App{Config: Config{Server: ServerConfig{ListenAddress: listener.Addr().String()}}}
	var bindError *net.OpError
	if err := app.Start(); !errors.As(err, &bindError) || bindError.Op != "listen" {
		t.Fatalf("expected listen error, got %v", err)
	}
}

func TestAppShutdownDrainsActiveHTTPRequests(t *testing.T) {
	listener := &closeSignalingListener{Listener: newTestListener(t), closed: make(chan struct{})}
	entered := make(chan struct{})
	release := make(chan struct{})
	router := echo.New()
	router.GET("/active", func(c *echo.Context) error {
		close(entered)
		<-release
		return c.String(http.StatusOK, "drained")
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	app := &App{HTTP: router}
	serverDone := make(chan error, 1)
	go func() { serverDone <- app.serveHTTP(ctx, cancel, listener) }()

	type result struct {
		code int
		body string
		err  error
	}
	requestDone := make(chan result, 1)
	go func() {
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Get("http://" + listener.Addr().String() + "/active")
		if err != nil {
			requestDone <- result{err: err}
			return
		}
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		requestDone <- result{code: resp.StatusCode, body: string(body), err: err}
	}()

	select {
	case <-entered:
	case response := <-requestDone:
		t.Fatalf("request completed before reaching handler: %+v", response)
	}
	cancel()
	<-listener.closed
	select {
	case err := <-serverDone:
		close(release)
		t.Fatalf("server stopped while handler was active: %v", err)
	default:
		close(release)
	}
	if response := <-requestDone; response.code != http.StatusOK || response.body != "drained" || response.err != nil {
		t.Fatalf("active request did not complete: %+v", response)
	}
	if err := <-serverDone; err != nil {
		t.Fatalf("graceful shutdown failed: %v", err)
	}
}

func newTestListener(t *testing.T) net.Listener {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = listener.Close() })
	return listener
}

type closeSignalingListener struct {
	net.Listener
	closed chan struct{}
	once   sync.Once
}

func (listener *closeSignalingListener) Close() error {
	err := listener.Listener.Close()
	listener.once.Do(func() { close(listener.closed) })
	return err
}
