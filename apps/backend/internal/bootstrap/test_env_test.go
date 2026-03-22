package bootstrap

import (
	"bufio"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func mustRuntimeConfigFromRepositoryEnv(t *testing.T) Config {
	t.Helper()

	values := map[string]string{}
	root := repositoryRootForTests(t)
	mergeTestEnvFile(t, values, filepath.Join(root, ".env"), false)
	mergeTestEnvFile(t, values, filepath.Join(root, ".env.local"), true)

	cfg, err := ConfigFromEnvironment(func(key string) string {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
		return values[key]
	})
	if err != nil {
		t.Fatalf("load runtime config from repository env: %v", err)
	}

	cfg.Server.ListenAddress = ":0"
	return cfg
}

func repositoryRootForTests(t *testing.T) string {
	t.Helper()

	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test helper path")
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

func mergeTestEnvFile(t *testing.T, target map[string]string, filePath string, required bool) {
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
