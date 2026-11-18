package main

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// Normalize legacy nullable fields for the v2.8 generator in a private copy.
// Keep companion specs beside the input so import-mapped references still resolve.
func normalizedOpenAPI31Path(inputPath string) (string, func(), error) {
	dir, err := os.MkdirTemp("", "oapi-generate-*")
	if err != nil {
		return "", nil, err
	}
	cleanup := func() { _ = os.RemoveAll(dir) }
	files := []string{inputPath}
	shared := filepath.Join(filepath.Dir(inputPath), "opentoggl-shared.openapi.json")
	if filepath.Base(inputPath) != filepath.Base(shared) {
		files = append(files, shared)
	}
	for _, path := range files {
		if err := writeNormalizedOpenAPI31(path, dir); err != nil {
			cleanup()
			return "", nil, err
		}
	}
	return filepath.Join(dir, filepath.Base(inputPath)), cleanup, nil
}

func writeNormalizedOpenAPI31(path, dir string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	data, err = normalizeLegacyNullable(data, true)
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(dir, filepath.Base(path)), data, 0o600)
}

func normalizeLegacyNullable(data []byte, openAPI31 bool) ([]byte, error) {
	var document map[string]any
	if err := json.Unmarshal(data, &document); err != nil {
		return nil, err
	}
	preserveNullableFields(document, openAPI31)
	return json.Marshal(document)
}

func preserveNullableFields(node any, openAPI31 bool) {
	switch value := node.(type) {
	case map[string]any:
		if value["nullable"] == true {
			if _, configured := value["x-omitempty"]; !configured {
				// Previous bindings serialized absent nullable fields as JSON null.
				value["x-omitempty"] = false
			}
			if schemaType, ok := value["type"].(string); openAPI31 && ok {
				value["type"] = []string{schemaType, "null"}
				delete(value, "nullable")
			}
		}
		for _, child := range value {
			preserveNullableFields(child, openAPI31)
		}
	case []any:
		for _, child := range value {
			preserveNullableFields(child, openAPI31)
		}
	}
}
