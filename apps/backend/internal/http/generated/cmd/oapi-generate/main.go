package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/getkin/kin-openapi/openapi2"
	"github.com/getkin/kin-openapi/openapi2conv"
)

const oapiCodegenCommand = "github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@v2.4.1"

type specVersion struct {
	Swagger string `json:"swagger"`
	OpenAPI string `json:"openapi"`
}

func main() {
	var configPath string
	var outputPath string

	flag.StringVar(&configPath, "config", "", "path to oapi-codegen yaml config")
	flag.StringVar(&outputPath, "o", "", "generated output path")
	flag.Parse()

	if configPath == "" || outputPath == "" || flag.NArg() != 1 {
		exitf("usage: oapi-generate -config <config> -o <output> <openapi-file>")
	}

	inputPath := flag.Arg(0)
	specPath, cleanup, err := normalizedSpecPath(inputPath)
	if err != nil {
		exitf("normalize spec: %v", err)
	}
	if cleanup != nil {
		defer cleanup()
	}

	command := exec.Command(
		"go",
		"run",
		oapiCodegenCommand,
		"-config", configPath,
		"-o", outputPath,
		specPath,
	)
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	command.Dir = "."

	if err := command.Run(); err != nil {
		exitf("run oapi-codegen: %v", err)
	}
}

func normalizedSpecPath(inputPath string) (string, func(), error) {
	data, err := os.ReadFile(inputPath)
	if err != nil {
		return "", nil, err
	}

	var version specVersion
	if err := json.Unmarshal(data, &version); err != nil {
		return "", nil, err
	}

	if version.Swagger != "2.0" {
		return inputPath, nil, nil
	}

	data, err = normalizeSwagger2(data)
	if err != nil {
		return "", nil, err
	}

	var document openapi2.T
	if err := json.Unmarshal(data, &document); err != nil {
		return "", nil, err
	}

	converted, err := openapi2conv.ToV3(&document)
	if err != nil {
		return "", nil, err
	}

	convertedData, err := json.Marshal(converted)
	if err != nil {
		return "", nil, err
	}

	tempDir, err := os.MkdirTemp("", "oapi-generate-*")
	if err != nil {
		return "", nil, err
	}

	tempPath := filepath.Join(tempDir, filepath.Base(inputPath))
	if err := os.WriteFile(tempPath, convertedData, 0o600); err != nil {
		_ = os.RemoveAll(tempDir)
		return "", nil, err
	}

	return tempPath, func() {
		_ = os.RemoveAll(tempDir)
	}, nil
}

func exitf(format string, args ...any) {
	_, _ = fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}

var pathParameterPattern = regexp.MustCompile(`\{([^}]+)\}`)

func normalizeSwagger2(data []byte) ([]byte, error) {
	var document map[string]any
	if err := json.Unmarshal(data, &document); err != nil {
		return nil, err
	}

	paths, ok := document["paths"].(map[string]any)
	if !ok {
		return data, nil
	}

	for rawPath, rawPathItem := range paths {
		pathItem, ok := rawPathItem.(map[string]any)
		if !ok {
			continue
		}

		pathLevelNames := declaredPathParameterNames(pathItem["parameters"])
		placeholders := pathParameterPattern.FindAllStringSubmatch(rawPath, -1)

		for method, rawOperation := range pathItem {
			if !isHTTPMethod(method) {
				continue
			}

			operation, ok := rawOperation.(map[string]any)
			if !ok {
				continue
			}

			parameters := parameterList(operation["parameters"])
			parameters = normalizeMultipleBodyParameters(parameters)
			parameters = addMissingPathParameters(parameters, placeholders, pathLevelNames)
			operation["parameters"] = parameters
		}
	}

	return json.Marshal(document)
}

func declaredPathParameterNames(raw any) map[string]struct{} {
	names := make(map[string]struct{})
	for _, parameter := range parameterList(raw) {
		location, _ := parameter["in"].(string)
		name, _ := parameter["name"].(string)
		if location == "path" && name != "" {
			names[name] = struct{}{}
		}
	}
	return names
}

func normalizeMultipleBodyParameters(parameters []map[string]any) []map[string]any {
	bodyParameters := make([]map[string]any, 0)
	kept := make([]map[string]any, 0, len(parameters))

	for _, parameter := range parameters {
		if parameter["in"] == "body" {
			bodyParameters = append(bodyParameters, parameter)
			continue
		}
		kept = append(kept, parameter)
	}

	if len(bodyParameters) <= 1 {
		return parameters
	}

	properties := make(map[string]any, len(bodyParameters))
	required := make([]string, 0)
	for _, parameter := range bodyParameters {
		name, _ := parameter["name"].(string)
		if name == "" {
			continue
		}

		properties[name] = parameterSchema(parameter)
		if isRequired, _ := parameter["required"].(bool); isRequired {
			required = append(required, name)
		}
	}

	schema := map[string]any{
		"type":       "object",
		"properties": properties,
	}
	if len(required) > 0 {
		schema["required"] = required
	}

	kept = append(kept, map[string]any{
		"name":     "body",
		"in":       "body",
		"required": true,
		"schema":   schema,
	})

	return kept
}

func addMissingPathParameters(
	parameters []map[string]any,
	placeholders [][]string,
	pathLevelNames map[string]struct{},
) []map[string]any {
	declared := make(map[string]struct{}, len(pathLevelNames)+len(parameters))
	for name := range pathLevelNames {
		declared[name] = struct{}{}
	}
	for _, parameter := range parameters {
		if parameter["in"] == "path" {
			if name, _ := parameter["name"].(string); name != "" {
				declared[name] = struct{}{}
			}
		}
	}

	for _, match := range placeholders {
		if len(match) < 2 {
			continue
		}
		name := match[1]
		if _, ok := declared[name]; ok {
			continue
		}

		parameters = append(parameters, map[string]any{
			"name":     name,
			"in":       "path",
			"required": true,
			"type":     inferredPathParameterType(name),
		})
	}

	return parameters
}

func parameterList(raw any) []map[string]any {
	items, ok := raw.([]any)
	if !ok {
		return []map[string]any{}
	}

	parameters := make([]map[string]any, 0, len(items))
	for _, item := range items {
		parameter, ok := item.(map[string]any)
		if ok {
			parameters = append(parameters, parameter)
		}
	}
	return parameters
}

func parameterSchema(parameter map[string]any) map[string]any {
	if schema, ok := parameter["schema"].(map[string]any); ok {
		return schema
	}

	schema := map[string]any{}
	for _, key := range []string{"type", "format", "items", "enum", "default"} {
		if value, ok := parameter[key]; ok {
			schema[key] = value
		}
	}
	return schema
}

func inferredPathParameterType(name string) string {
	if strings.HasSuffix(name, "_id") || strings.HasSuffix(name, "Id") {
		return "integer"
	}
	return "string"
}

func isHTTPMethod(value string) bool {
	switch strings.ToLower(value) {
	case "get", "post", "put", "patch", "delete", "head", "options":
		return true
	default:
		return false
	}
}
