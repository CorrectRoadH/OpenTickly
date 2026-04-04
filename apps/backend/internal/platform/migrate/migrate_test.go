package migrate_test

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/platform/migrate"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestLatestSQLMatchesMigrations(t *testing.T) {
	ctx := context.Background()
	baseDSN := requiredDatabaseURL(t)
	adminPool, err := pgxpool.New(ctx, baseDSN)
	if err != nil {
		t.Fatalf("open admin pool: %v", err)
	}
	defer adminPool.Close()

	migratedSchema := createEphemeralSchema(t, ctx, adminPool)
	latestSchema := createEphemeralSchema(t, ctx, adminPool)

	migratedPool := scopedPool(t, baseDSN, migratedSchema)
	latestPool := scopedPool(t, baseDSN, latestSchema)

	// Apply migrations via goose
	if err := migrate.Run(ctx, migratedPool); err != nil {
		t.Fatalf("goose up: %v", err)
	}

	// Apply latest.sql directly
	latestSQL, err := os.ReadFile(latestSQLPath(t))
	if err != nil {
		t.Fatalf("read latest.sql: %v", err)
	}
	if _, err := latestPool.Exec(ctx, string(latestSQL)); err != nil {
		t.Fatalf("exec latest.sql: %v", err)
	}

	// Compare columns
	compareQuery(t, ctx, migratedPool, latestPool,
		`SELECT table_name, column_name, data_type, is_nullable, column_default
		FROM information_schema.columns
		WHERE table_schema = current_schema() AND table_name != 'goose_db_version'
		ORDER BY table_name, ordinal_position`,
		"columns",
	)

	// Compare indexes
	compareQuery(t, ctx, migratedPool, latestPool,
		fmt.Sprintf(
			`SELECT tablename, indexname, replace(indexdef, '%s.', '%s.')
			FROM pg_indexes
			WHERE schemaname = current_schema() AND tablename != 'goose_db_version'
			ORDER BY tablename, indexname`,
			migratedSchema, latestSchema,
		),
		"indexes",
	)

	// Compare named constraints (exclude auto-generated NOT NULL names which contain OIDs)
	compareQuery(t, ctx, migratedPool, latestPool,
		`SELECT tc.table_name, tc.constraint_type, cc.check_clause
		FROM information_schema.table_constraints tc
		LEFT JOIN information_schema.check_constraints cc
			ON tc.constraint_name = cc.constraint_name AND tc.constraint_schema = cc.constraint_schema
		WHERE tc.table_schema = current_schema() AND tc.table_name != 'goose_db_version'
			AND tc.constraint_name NOT LIKE '%_not_null'
		ORDER BY tc.table_name, tc.constraint_type, cc.check_clause`,
		"constraints",
	)
}

func compareQuery(t *testing.T, ctx context.Context, migrated, latest *pgxpool.Pool, query string, label string) {
	t.Helper()
	migratedRows := collectRows(t, ctx, migrated, query)
	latestRows := collectRows(t, ctx, latest, query)

	if len(migratedRows) != len(latestRows) {
		t.Errorf("%s: row count mismatch: migrations=%d latest.sql=%d", label, len(migratedRows), len(latestRows))
	}

	maxLen := len(migratedRows)
	if len(latestRows) > maxLen {
		maxLen = len(latestRows)
	}

	diffs := 0
	for i := 0; i < maxLen; i++ {
		var m, l string
		if i < len(migratedRows) {
			m = migratedRows[i]
		}
		if i < len(latestRows) {
			l = latestRows[i]
		}
		if m != l {
			diffs++
			if diffs <= 20 {
				t.Errorf("%s diff [%d]:\n  migrations: %s\n  latest.sql: %s", label, i, m, l)
			}
		}
	}
	if diffs > 20 {
		t.Errorf("%s: %d more diffs omitted", label, diffs-20)
	}
}

func collectRows(t *testing.T, ctx context.Context, pool *pgxpool.Pool, query string) []string {
	t.Helper()
	rows, err := pool.Query(ctx, query)
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	defer rows.Close()

	var result []string
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			t.Fatalf("scan row: %v", err)
		}
		parts := make([]string, len(vals))
		for i, v := range vals {
			parts[i] = fmt.Sprintf("%v", v)
		}
		result = append(result, strings.Join(parts, "|"))
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("rows iteration: %v", err)
	}
	return result
}

func createEphemeralSchema(t *testing.T, ctx context.Context, adminPool *pgxpool.Pool) string {
	t.Helper()
	name := fmt.Sprintf("schema_verify_%d", time.Now().UnixNano())
	if _, err := adminPool.Exec(ctx, "CREATE SCHEMA "+quoteIdent(name)); err != nil {
		t.Fatalf("create schema %s: %v", name, err)
	}
	t.Cleanup(func() {
		_, _ = adminPool.Exec(context.Background(), "DROP SCHEMA IF EXISTS "+quoteIdent(name)+" CASCADE")
	})
	return name
}

func scopedPool(t *testing.T, baseDSN string, schemaName string) *pgxpool.Pool {
	t.Helper()
	config, err := pgxpool.ParseConfig(baseDSN)
	if err != nil {
		t.Fatalf("parse dsn: %v", err)
	}
	config.ConnConfig.RuntimeParams["search_path"] = schemaName
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		t.Fatalf("open scoped pool: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func latestSQLPath(t *testing.T) string {
	t.Helper()
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path")
	}
	// navigate from internal/platform/migrate/ up to apps/backend/
	backendDir := filepath.Join(filepath.Dir(currentFile), "..", "..", "..")
	return filepath.Join(backendDir, "db", "schema", "latest.sql")
}

func requiredDatabaseURL(t *testing.T) string {
	t.Helper()
	if v := strings.TrimSpace(os.Getenv("DATABASE_URL")); v != "" {
		return v
	}
	root := repositoryRoot(t)
	values := map[string]string{}
	mergeEnvFile(t, values, filepath.Join(root, ".env.local"))
	v := strings.TrimSpace(values["DATABASE_URL"])
	if v == "" {
		t.Fatal("missing DATABASE_URL in environment or .env.local")
	}
	return v
}

func repositoryRoot(t *testing.T) string {
	t.Helper()
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path")
	}
	dir := filepath.Dir(currentFile)
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("locate repository root")
		}
		dir = parent
	}
}

func mergeEnvFile(t *testing.T, target map[string]string, path string) {
	t.Helper()
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return
		}
		t.Fatalf("open %s: %v", path, err)
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		target[strings.TrimSpace(k)] = strings.Trim(strings.TrimSpace(v), `"'`)
	}
}

func quoteIdent(s string) string {
	return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
}
