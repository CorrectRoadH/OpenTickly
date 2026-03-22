package bootstrap

import (
	"net/http"
	"strconv"
	"testing"
)

func TestWebWorkspaceCapabilityAndQuotaRoutesMatchOpenAPIShape(t *testing.T) {
	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server: ServerConfig{
			ListenAddress: ":0",
		},
		Database: DatabaseConfig{
			PrimaryDSN: "postgres://opentoggl@localhost:5432/opentoggl",
		},
		Redis: RedisConfig{
			Address: "redis://127.0.0.1:6379/0",
		},
	})
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    "caps-quota@example.com",
		"fullname": "Capabilities Quota",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	sessionCookie := register.Header().Get("Set-Cookie")
	if sessionCookie == "" {
		t.Fatal("expected register response to set session cookie")
	}

	var bootstrapResponse struct {
		CurrentOrganizationID *int64 `json:"current_organization_id"`
		CurrentWorkspaceID    *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &bootstrapResponse)
	if bootstrapResponse.CurrentWorkspaceID == nil || *bootstrapResponse.CurrentWorkspaceID <= 0 {
		t.Fatalf("expected current workspace id > 0, got %#v", bootstrapResponse.CurrentWorkspaceID)
	}
	if bootstrapResponse.CurrentOrganizationID == nil || *bootstrapResponse.CurrentOrganizationID <= 0 {
		t.Fatalf("expected current organization id > 0, got %#v", bootstrapResponse.CurrentOrganizationID)
	}

	workspaceID := *bootstrapResponse.CurrentWorkspaceID
	organizationID := *bootstrapResponse.CurrentOrganizationID

	capabilitiesPath := "/web/v1/workspaces/" + intToString(workspaceID) + "/capabilities"
	capabilities := performJSONRequest(t, app, http.MethodGet, capabilitiesPath, nil, sessionCookie)
	if capabilities.Code != http.StatusOK {
		t.Fatalf("expected workspace capabilities status 200, got %d body=%s", capabilities.Code, capabilities.Body.String())
	}
	var capabilitiesBody struct {
		Context struct {
			OrganizationID *int64 `json:"organization_id"`
			WorkspaceID    *int64 `json:"workspace_id"`
			Scope          string `json:"scope"`
		} `json:"context"`
		Capabilities []struct {
			Key     string `json:"key"`
			Enabled bool   `json:"enabled"`
			Source  string `json:"source"`
		} `json:"capabilities"`
	}
	mustDecodeJSON(t, capabilities.Body.Bytes(), &capabilitiesBody)
	if capabilitiesBody.Context.OrganizationID == nil || *capabilitiesBody.Context.OrganizationID != organizationID {
		t.Fatalf("expected capabilities organization id %d, got %#v", organizationID, capabilitiesBody.Context.OrganizationID)
	}
	if capabilitiesBody.Context.WorkspaceID == nil || *capabilitiesBody.Context.WorkspaceID != workspaceID {
		t.Fatalf("expected capabilities workspace id %d, got %#v", workspaceID, capabilitiesBody.Context.WorkspaceID)
	}
	if capabilitiesBody.Context.Scope != "workspace" {
		t.Fatalf("expected capabilities scope workspace, got %q", capabilitiesBody.Context.Scope)
	}
	if len(capabilitiesBody.Capabilities) == 0 {
		t.Fatal("expected capabilities to include at least one feature capability")
	}
	if len(capabilitiesBody.Capabilities) != 3 {
		t.Fatalf("expected 3 billing capability rules, got %#v", capabilitiesBody.Capabilities)
	}
	expectedCapabilities := map[string]bool{
		"reports.profitability": false,
		"reports.summary":       false,
		"time_tracking":         true,
	}
	for _, capability := range capabilitiesBody.Capabilities {
		wantEnabled, ok := expectedCapabilities[capability.Key]
		if !ok {
			t.Fatalf("expected capability key from billing rules, got %q", capability.Key)
		}
		if capability.Source != "billing" {
			t.Fatalf("expected capability source billing, got %q for key %q", capability.Source, capability.Key)
		}
		if capability.Enabled != wantEnabled {
			t.Fatalf("expected capability %q enabled=%t, got %#v", capability.Key, wantEnabled, capability)
		}
		delete(expectedCapabilities, capability.Key)
	}
	if len(expectedCapabilities) != 0 {
		t.Fatalf("expected all billing capability keys to be present, missing %#v", expectedCapabilities)
	}

	quotaPath := "/web/v1/workspaces/" + intToString(workspaceID) + "/quota"
	quota := performJSONRequest(t, app, http.MethodGet, quotaPath, nil, sessionCookie)
	if quota.Code != http.StatusOK {
		t.Fatalf("expected workspace quota status 200, got %d body=%s", quota.Code, quota.Body.String())
	}
	var quotaBody struct {
		OrganizationID *int64 `json:"organization_id"`
		Remaining      int    `json:"remaining"`
		ResetsInSecs   int    `json:"resets_in_secs"`
		Total          int    `json:"total"`
	}
	mustDecodeJSON(t, quota.Body.Bytes(), &quotaBody)
	if quotaBody.OrganizationID == nil || *quotaBody.OrganizationID != organizationID {
		t.Fatalf("expected quota organization id %d, got %#v", organizationID, quotaBody.OrganizationID)
	}
	if quotaBody.Remaining != 0 || quotaBody.ResetsInSecs != 0 || quotaBody.Total != 0 {
		t.Fatalf("expected default billing quota window to be zeroed, got %#v", quotaBody)
	}

	assertQuotaHeaderMatchesBody(t, quota.Header().Get("X-OpenToggl-Quota-Remaining"), quotaBody.Remaining, "X-OpenToggl-Quota-Remaining")
	assertQuotaHeaderMatchesBody(t, quota.Header().Get("X-OpenToggl-Quota-Reset-In-Secs"), quotaBody.ResetsInSecs, "X-OpenToggl-Quota-Reset-In-Secs")
	assertQuotaHeaderMatchesBody(t, quota.Header().Get("X-OpenToggl-Quota-Total"), quotaBody.Total, "X-OpenToggl-Quota-Total")

	invalidCapabilitiesPath := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/workspaces/not-a-number/capabilities",
		nil,
		sessionCookie,
	)
	if invalidCapabilitiesPath.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid workspace capabilities id status 400, got %d body=%s", invalidCapabilitiesPath.Code, invalidCapabilitiesPath.Body.String())
	}

	invalidQuotaPath := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/workspaces/not-a-number/quota",
		nil,
		sessionCookie,
	)
	if invalidQuotaPath.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid workspace quota id status 400, got %d body=%s", invalidQuotaPath.Code, invalidQuotaPath.Body.String())
	}
}

func assertQuotaHeaderMatchesBody(t *testing.T, got string, want int, headerName string) {
	t.Helper()
	if got == "" {
		t.Fatalf("expected %s header to be set", headerName)
	}
	parsed, err := strconv.Atoi(got)
	if err != nil {
		t.Fatalf("expected %s to be an integer, got %q", headerName, got)
	}
	if parsed != want {
		t.Fatalf("expected %s=%d, got %d", headerName, want, parsed)
	}
}
