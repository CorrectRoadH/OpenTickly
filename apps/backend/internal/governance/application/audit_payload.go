package application

import (
	"bytes"
	"encoding/json"
	"strings"
)

const AuditPayloadMaxSize = 8192

func SensitiveAuditPath(path string) bool {
	for _, part := range strings.Split(path, "/") {
		switch part {
		case "auth", "reset_token", "sso", "saml":
			return true
		}
	}
	return false
}

// Only complete JSON objects/arrays are eligible for audit payloads. Scalar
// responses (including API tokens), malformed and oversized bodies are omitted.
func SanitizeAuditPayload(body []byte) string {
	body = bytes.TrimSpace(body)
	if len(body) == 0 || len(body) > AuditPayloadMaxSize || !json.Valid(body) || (body[0] != '{' && body[0] != '[') {
		return ""
	}
	redacted, err := redactAuditJSON(body)
	if err != nil {
		return ""
	}
	return string(redacted)
}

func redactAuditJSON(body json.RawMessage) (json.RawMessage, error) {
	body = bytes.TrimSpace(body)
	if len(body) == 0 {
		return body, nil
	}
	switch body[0] {
	case '{':
		var fields map[string]json.RawMessage
		if err := json.Unmarshal(body, &fields); err != nil {
			return nil, err
		}
		for key, value := range fields {
			normalized := strings.NewReplacer("_", "", "-", "", " ", "").Replace(strings.ToLower(key))
			sensitive := false
			for _, fragment := range []string{"password", "token", "secret", "authorization", "cookie", "credential", "privatekey", "apikey"} {
				if strings.Contains(normalized, fragment) {
					sensitive = true
					break
				}
			}
			if sensitive {
				delete(fields, key)
				continue
			}
			redacted, err := redactAuditJSON(value)
			if err != nil {
				return nil, err
			}
			fields[key] = redacted
		}
		return json.Marshal(fields)
	case '[':
		var values []json.RawMessage
		if err := json.Unmarshal(body, &values); err != nil {
			return nil, err
		}
		for i, value := range values {
			redacted, err := redactAuditJSON(value)
			if err != nil {
				return nil, err
			}
			values[i] = redacted
		}
		return json.Marshal(values)
	default:
		return body, nil
	}
}

// Historical audit data is untrusted too: older releases captured unscoped
// previous rows and raw credentials. Never expose those through read/export.
func sanitizeAuditPayloads(action string, workspaceID *int64, request, response, metadata string) (string, string, string) {
	if SensitiveAuditPath(action) {
		return "", "", ""
	}
	request, response = SanitizeAuditPayload([]byte(request)), SanitizeAuditPayload([]byte(response))
	var snapshot struct {
		Previous struct {
			WorkspaceID int64 `json:"workspace_id"`
		} `json:"previous"`
	}
	if workspaceID == nil || json.Unmarshal([]byte(metadata), &snapshot) != nil || snapshot.Previous.WorkspaceID != *workspaceID {
		metadata = ""
	} else {
		metadata = SanitizeAuditPayload([]byte(metadata))
	}
	return request, response, metadata
}
