package bootstrap

import (
	"net/http"
	"strings"
	"testing"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	identitysaml "opentoggl/backend/apps/backend/internal/identity/saml"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"

	"github.com/oapi-codegen/runtime/types"
	"github.com/samber/lo"
)

func TestUpdateWorkspaceSsoConfigRejectsInvalidEnabledConfig(t *testing.T) {
	app, cookie, workspaceID := newSsoConfigRouteTestApp(t)
	keypair, err := identitysaml.GenerateKeypair()
	if err != nil {
		t.Fatalf("GenerateKeypair: %v", err)
	}

	base := validWorkspaceSsoConfigUpdate(
		"sso-config-"+intToString(workspaceID)+".example.com",
		keypair.CertificatePEM,
	)
	cases := []struct {
		name string
		body webapi.WorkspaceSsoConfigUpdate
		want string
	}{
		{
			name: "invalid email domain",
			body: withSsoConfig(base, func(body *webapi.WorkspaceSsoConfigUpdate) {
				body.EmailDomain = "-bad.com"
			}),
			want: "valid email domain",
		},
		{
			name: "invalid manual sso url",
			body: withSsoConfig(base, func(body *webapi.WorkspaceSsoConfigUpdate) {
				body.IdpSsoUrl = "idp.example.com/sso"
			}),
			want: "valid http(s) URL",
		},
		{
			name: "invalid manual certificate",
			body: withSsoConfig(base, func(body *webapi.WorkspaceSsoConfigUpdate) {
				body.IdpCertificate = "not a certificate"
			}),
			want: "valid X.509 certificate",
		},
		{
			name: "invalid metadata url",
			body: withSsoConfig(base, func(body *webapi.WorkspaceSsoConfigUpdate) {
				body.IdpMetadataUrl = "idp.example.com/metadata"
				body.IdpSsoUrl = ""
				body.IdpEntityId = ""
				body.IdpCertificate = ""
			}),
			want: "valid http(s) URL",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			response := performJSONRequest(
				t,
				app,
				http.MethodPut,
				"/web/v1/workspaces/"+intToString(workspaceID)+"/sso-config",
				tc.body,
				cookie,
			)
			if response.Code != http.StatusBadRequest {
				t.Fatalf("expected invalid enabled config status 400, got %d body=%s", response.Code, response.Body.String())
			}
			if !strings.Contains(response.Body.String(), tc.want) {
				t.Fatalf("expected response to mention %q, got %s", tc.want, response.Body.String())
			}
		})
	}
}

func TestUpdateWorkspaceSsoConfigAllowsDisabledDraft(t *testing.T) {
	app, cookie, workspaceID := newSsoConfigRouteTestApp(t)
	body := webapi.WorkspaceSsoConfigUpdate{
		Enabled:        false,
		ProfileName:    "Draft SSO",
		EmailDomain:    "-bad.com",
		IdpMetadataUrl: "idp.example.com/metadata",
	}

	response := performJSONRequest(
		t,
		app,
		http.MethodPut,
		"/web/v1/workspaces/"+intToString(workspaceID)+"/sso-config",
		body,
		cookie,
	)
	if response.Code != http.StatusOK {
		t.Fatalf("expected disabled draft status 200, got %d body=%s", response.Code, response.Body.String())
	}
}

func TestUpdateWorkspaceSsoConfigAcceptsValidEnabledManualConfig(t *testing.T) {
	app, cookie, workspaceID := newSsoConfigRouteTestApp(t)
	keypair, err := identitysaml.GenerateKeypair()
	if err != nil {
		t.Fatalf("GenerateKeypair: %v", err)
	}

	response := performJSONRequest(
		t,
		app,
		http.MethodPut,
		"/web/v1/workspaces/"+intToString(workspaceID)+"/sso-config",
		validWorkspaceSsoConfigUpdate(
			"sso-config-"+intToString(workspaceID)+".example.com",
			keypair.CertificatePEM,
		),
		cookie,
	)
	if response.Code != http.StatusOK {
		t.Fatalf("expected valid enabled config status 200, got %d body=%s", response.Code, response.Body.String())
	}
}

func newSsoConfigRouteTestApp(t *testing.T) (*App, string, int64) {
	t.Helper()

	database := pgtest.Open(t)
	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server:      ServerConfig{ListenAddress: ":0"},
		Database:    DatabaseConfig{PrimaryDSN: database.ConnString()},
		Redis:       RedisConfig{Address: "redis://127.0.0.1:6379/0"},
	})
	if err != nil {
		t.Fatalf("NewApp: %v", err)
	}
	t.Cleanup(app.Platform.Database.Close)

	fullName := "SSO Config Owner"
	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", webapi.RegisterRequest{
		Email:    types.Email(uniqueTestEmail("sso-config")),
		Fullname: lo.ToPtr(fullName),
		Password: "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	var body struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &body)
	if body.CurrentWorkspaceID == nil {
		t.Fatalf("expected register response to include current workspace id")
	}
	return app, register.Header().Get("Set-Cookie"), *body.CurrentWorkspaceID
}

func validWorkspaceSsoConfigUpdate(domain string, certificate string) webapi.WorkspaceSsoConfigUpdate {
	return webapi.WorkspaceSsoConfigUpdate{
		Enabled:        true,
		ProfileName:    "Acme SSO",
		EmailDomain:    domain,
		IdpEntityId:    "https://idp.example.com/entity",
		IdpSsoUrl:      "https://idp.example.com/sso",
		IdpCertificate: certificate,
	}
}

func withSsoConfig(
	body webapi.WorkspaceSsoConfigUpdate,
	mutate func(*webapi.WorkspaceSsoConfigUpdate),
) webapi.WorkspaceSsoConfigUpdate {
	mutate(&body)
	return body
}
