package publicapi

import (
	"encoding/json"
	"testing"
)

func TestResolveTrackNullableProjectID(t *testing.T) {
	t.Run("returns zero sentinel when project_id is explicitly null", func(t *testing.T) {
		projectID := resolveTrackNullableProjectID(map[string]json.RawMessage{
			"project_id": json.RawMessage("null"),
		})
		if projectID == nil || *projectID != 0 {
			t.Fatalf("expected explicit null to resolve to zero sentinel, got %#v", projectID)
		}
	})

	t.Run("prefers explicit numeric project id", func(t *testing.T) {
		value := 42
		projectID := resolveTrackNullableProjectID(map[string]json.RawMessage{
			"project_id": json.RawMessage("42"),
		}, &value)
		if projectID == nil || *projectID != 42 {
			t.Fatalf("expected numeric project id, got %#v", projectID)
		}
	})

	t.Run("returns nil when project field is omitted", func(t *testing.T) {
		projectID := resolveTrackNullableProjectID(map[string]json.RawMessage{})
		if projectID != nil {
			t.Fatalf("expected nil for omitted project id, got %#v", projectID)
		}
	})
}
