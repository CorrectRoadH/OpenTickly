package pgtest

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/url"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestConcurrentOpen(t *testing.T) {
	if os.Getenv("OPENTICKLY_PGTEST_CHILD") == "1" {
		if _, err := io.ReadAll(os.Stdin); err != nil {
			t.Fatal(err)
		}
		database := Open(t)
		var count int
		if err := database.Pool.QueryRow(context.Background(), "select count(*) from identity_users").Scan(&count); err != nil {
			t.Fatal(err)
		}
		return
	}
	ctx := context.Background()
	dsn := requiredDatabaseURL(t)
	admin, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	name := fmt.Sprintf("pgtest_concurrent_%d", time.Now().UnixNano())
	if _, err := admin.Exec(ctx, "create database "+quoteIdentifier(name)); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, err := admin.Exec(ctx, "drop database "+quoteIdentifier(name)); err != nil {
			t.Error(err)
		}
	}()
	parsed, err := url.Parse(dsn)
	if err != nil {
		t.Fatal(err)
	}
	parsed.Path = "/" + name
	type child struct {
		command *exec.Cmd
		input   io.WriteCloser
		output  bytes.Buffer
	}
	children := make([]child, 8)
	for i := range children {
		worker := &children[i]
		worker.command = exec.Command(os.Args[0], "-test.run=^TestConcurrentOpen$", "-test.timeout=45s")
		for _, entry := range os.Environ() {
			if !strings.HasPrefix(entry, "DATABASE_URL=") {
				worker.command.Env = append(worker.command.Env, entry)
			}
		}
		worker.command.Env = append(worker.command.Env, "DATABASE_URL="+parsed.String(), "OPENTICKLY_PGTEST_CHILD=1")
		worker.command.Stdout = &worker.output
		worker.command.Stderr = &worker.output
		worker.input, err = worker.command.StdinPipe()
		if err != nil {
			t.Fatal(err)
		}
		if err := worker.command.Start(); err != nil {
			t.Fatal(err)
		}
		defer func() {
			_ = worker.command.Process.Kill()
			_ = worker.command.Wait()
		}()
	}
	for i := range children {
		if err := children[i].input.Close(); err != nil {
			t.Error(err)
		}
	}
	for i := range children {
		if err := children[i].command.Wait(); err != nil {
			t.Errorf("worker %d: %v\n%s", i, err, children[i].output.String())
		}
	}
}
