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

	"opentoggl/backend/apps/backend/internal/platform/migrate"

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

// Canonical test schema name - all tests share this schema.
// Isolation inside the schema is achieved through Workspace + User ownership.
const canonicalSchema = "opentoggl_test"

// Open returns a Database connected to the canonical shared test schema.
// Tests are isolated inside the shared schema by Workspace + User ownership.
// This is the preferred test helper for backend tests.
func Open(t *testing.T) *Database {
	t.Helper()

	baseDSN := requiredDatabaseURL(t)
	adminPool, err := pgxpool.New(context.Background(), baseDSN)
	if err != nil {
		t.Fatalf("open admin postgres pool: %v", err)
	}

	// Ensure the canonical schema exists
	if _, err := adminPool.Exec(context.Background(), "create schema if not exists "+quoteIdentifier(canonicalSchema)); err != nil {
		adminPool.Close()
		t.Fatalf("create test schema %s: %v", canonicalSchema, err)
	}

	testPool, err := newSchemaScopedPool(baseDSN, canonicalSchema)
	if err != nil {
		adminPool.Close()
		t.Fatalf("open schema-scoped postgres pool: %v", err)
	}

	applySchema(t, testPool)

	database := &Database{
		Pool:   testPool,
		admin:  adminPool,
		schema: canonicalSchema,
	}

	// Note: we do NOT drop the canonical schema on cleanup since it's shared.

	t.Cleanup(func() {
		database.Pool.Close()
		database.admin.Close()
	})

	return database
}

// OpenEphemeral returns a Database connected to a unique ephemeral test schema.
// The schema is created with a timestamp suffix and dropped on cleanup.
// Use this only when tests require full schema isolation from other tests.
// Prefer Open() for normal tests that can share the canonical schema.
func OpenEphemeral(t *testing.T) *Database {
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

	if err := migrate.Run(context.Background(), pool); err != nil {
		t.Fatalf("apply schema via goose: %v", err)
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
