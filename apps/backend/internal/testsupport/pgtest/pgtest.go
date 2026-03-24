package pgtest

import (
	"bufio"
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/platform/schema"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Database struct {
	Pool   *pgxpool.Pool
	admin  *pgxpool.Pool
	schema string
}

func (database *Database) ConnString() string {
	if database == nil || database.Pool == nil {
		return ""
	}

	base := database.Pool.Config().ConnString()
	parsed, err := url.Parse(base)
	if err != nil {
		return base
	}
	query := parsed.Query()
	query.Set("search_path", database.schema)
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func Open(t *testing.T) *Database {
	t.Helper()

	baseDSN := requiredDatabaseURL(t)
	adminPool, err := pgxpool.New(context.Background(), baseDSN)
	if err != nil {
		t.Fatalf("open admin postgres pool: %v", err)
	}

	schemaName := fmt.Sprintf("opentoggl_test_%d", time.Now().UnixNano())
	if _, err := adminPool.Exec(context.Background(), "create schema "+quoteIdentifier(schemaName)); err != nil {
		adminPool.Close()
		t.Fatalf("create test schema %s: %v", schemaName, err)
	}

	testPool, err := newSchemaScopedPool(baseDSN, schemaName)
	if err != nil {
		dropSchema(context.Background(), adminPool, schemaName)
		adminPool.Close()
		t.Fatalf("open schema-scoped postgres pool: %v", err)
	}

	applySchema(t, testPool)

	database := &Database{
		Pool:   testPool,
		admin:  adminPool,
		schema: schemaName,
	}

	t.Cleanup(func() {
		database.Pool.Close()
		dropSchema(context.Background(), database.admin, database.schema)
		database.admin.Close()
	})

	return database
}

func newSchemaScopedPool(baseDSN string, schemaName string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(baseDSN)
	if err != nil {
		return nil, err
	}

	config.ConnConfig.RuntimeParams["search_path"] = schemaName
	return pgxpool.NewWithConfig(context.Background(), config)
}

func applySchema(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()

	contents, err := os.ReadFile(schema.Path())
	if err != nil {
		t.Fatalf("read schema sql: %v", err)
	}
	if strings.TrimSpace(string(contents)) == "" {
		return
	}
	if _, err := pool.Exec(context.Background(), string(contents)); err != nil {
		t.Fatalf("apply schema sql: %v", err)
	}
}

func requiredDatabaseURL(t *testing.T) string {
	t.Helper()

	if value := strings.TrimSpace(os.Getenv("DATABASE_URL")); value != "" {
		return value
	}

	values := map[string]string{}
	root := repositoryRoot(t)
	mergeEnvFile(t, values, filepath.Join(root, ".env.local"), true)

	value := strings.TrimSpace(values["DATABASE_URL"])
	if value == "" {
		t.Fatal("missing DATABASE_URL in environment or repo-root .env.local")
	}
	return value
}

func repositoryRoot(t *testing.T) string {
	t.Helper()

	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve pgtest helper path")
	}

	currentDir := filepath.Dir(currentFile)
	for {
		if _, err := os.Stat(filepath.Join(currentDir, "go.mod")); err == nil {
			return currentDir
		}

		parent := filepath.Dir(currentDir)
		if parent == currentDir {
			t.Fatal("locate repository root")
		}
		currentDir = parent
	}
}

func mergeEnvFile(t *testing.T, target map[string]string, filePath string, required bool) {
	t.Helper()

	file, err := os.Open(filePath)
	if err != nil {
		if !required && os.IsNotExist(err) {
			return
		}
		t.Fatalf("open %s: %v", filePath, err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		line = strings.TrimPrefix(line, "export ")
		key, value, found := strings.Cut(line, "=")
		if !found {
			continue
		}

		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}

		value = strings.TrimSpace(value)
		value = strings.Trim(value, `"'`)
		target[key] = value
	}

	if err := scanner.Err(); err != nil {
		t.Fatalf("scan %s: %v", filePath, err)
	}
}

func quoteIdentifier(value string) string {
	return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
}

func dropSchema(ctx context.Context, pool *pgxpool.Pool, schemaName string) {
	if pool == nil {
		return
	}
	_, _ = pool.Exec(ctx, "drop schema if exists "+quoteIdentifier(schemaName)+" cascade")
}
