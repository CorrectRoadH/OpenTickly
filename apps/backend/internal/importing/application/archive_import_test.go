package application

import (
	"archive/zip"
	"bytes"
	"errors"
	"strings"
	"testing"
)

func TestParseImportedArchiveRejectsExcessiveUncompressedSize(t *testing.T) {
	const maxImportArchiveUncompressedSize = 16 << 20

	archive := buildImportArchiveForTest(t, map[string]string{
		"clients.json":  "[]",
		"projects.json": "[]",
		"tags.json":     "[]",
		"padding.json":  strings.Repeat("a", maxImportArchiveUncompressedSize+1),
	})

	_, err := parseImportedArchive(archive)
	if !errors.Is(err, ErrImportArchiveInvalid) {
		t.Fatalf("expected ErrImportArchiveInvalid for oversized archive, got %v", err)
	}
}

func buildImportArchiveForTest(t *testing.T, entries map[string]string) []byte {
	t.Helper()

	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)
	for name, content := range entries {
		entry, err := writer.Create(name)
		if err != nil {
			t.Fatalf("create zip entry %s: %v", name, err)
		}
		if _, err := entry.Write([]byte(content)); err != nil {
			t.Fatalf("write zip entry %s: %v", name, err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close zip writer: %v", err)
	}
	return buffer.Bytes()
}
