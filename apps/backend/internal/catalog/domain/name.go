package domain

import (
	"fmt"
	"strings"
)

func NormalizeCatalogName(name string) (string, error) {
	normalized := strings.TrimSpace(name)
	if normalized == "" {
		return "", fmt.Errorf("catalog name is required")
	}
	return normalized, nil
}
