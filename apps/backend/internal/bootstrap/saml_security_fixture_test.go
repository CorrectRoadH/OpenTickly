package bootstrap

import (
	"context"
	"encoding/xml"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/crewjam/saml"
	"github.com/oapi-codegen/runtime/types"
	"github.com/samber/lo"
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	identitysaml "opentoggl/backend/apps/backend/internal/identity/saml"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

type samlSecurityFixture struct {
	app       *App
	db        *pgtest.Database
	workspace int64
	cookie    string
	email     string
	idp       *saml.IdentityProvider
}

func newSAMLSecurityFixture(t *testing.T) *samlSecurityFixture {
	t.Helper()
	redisURL := os.Getenv("SAML_TEST_REDIS_URL")
	if redisURL == "" {
		t.Skip("SAML_TEST_REDIS_URL must name an isolated Redis")
	}
	db := pgtest.OpenEphemeral(t)
	app, err := NewApp(Config{ServiceName: "saml-security-test", Server: ServerConfig{ListenAddress: ":0"}, Database: DatabaseConfig{PrimaryDSN: db.ConnString()}, Redis: RedisConfig{Address: redisURL}})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Platform.Database.Close)
	t.Cleanup(func() { _ = app.Platform.Cache.Close() })
	email := "owner@example.com"
	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", webapi.RegisterRequest{Email: types.Email(email), Fullname: lo.ToPtr("Local Owner"), Password: "secret1"}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("register: %d %s", register.Code, register.Body.String())
	}
	var body struct {
		CurrentWorkspaceID int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &body)
	cookie := register.Result().Cookies()[0].String()
	if _, err := db.Pool.Exec(context.Background(), `INSERT INTO instance_admin_config(id,site_url,email_verification_required) VALUES(1,'https://app.example.com',false) ON CONFLICT(id) DO UPDATE SET site_url=excluded.site_url,email_verification_required=false`); err != nil {
		t.Fatal(err)
	}
	key, err := identitysaml.GenerateKeypair()
	if err != nil {
		t.Fatal(err)
	}
	metadataURL, _ := url.Parse("https://idp.example.net/metadata")
	idp := &saml.IdentityProvider{Key: key.Key, Certificate: key.Certificate, MetadataURL: *metadataURL, SignatureMethod: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"}
	cfg := validWorkspaceSsoConfigUpdate("example.com", key.CertificatePEM)
	cfg.IdpEntityId = metadataURL.String()
	cfg.IdpSsoUrl = "https://idp.example.net/sso"
	response := performJSONRequest(t, app, http.MethodPut, "/web/v1/workspaces/"+intToString(body.CurrentWorkspaceID)+"/sso-config", cfg, cookie)
	if response.Code != 200 {
		t.Fatalf("config: %d %s", response.Code, response.Body.String())
	}
	return &samlSecurityFixture{app: app, db: db, workspace: body.CurrentWorkspaceID, cookie: cookie, email: email, idp: idp}
}

func (f *samlSecurityFixture) start(t *testing.T, link bool) (*saml.IdpAuthnRequest, string) {
	t.Helper()
	path := "/auth/saml2/login/" + intToString(f.workspace)
	var response *httptest.ResponseRecorder
	var target string
	if link {
		response = performJSONRequest(t, f.app, http.MethodPost, "/web/v1/workspaces/"+intToString(f.workspace)+"/sso-identity", struct{}{}, f.cookie)
		var body webapi.SsoStartResponse
		mustDecodeJSON(t, response.Body.Bytes(), &body)
		target = body.AuthorizationUrl
	} else {
		response = performJSONRequest(t, f.app, http.MethodGet, path, nil, "")
		target = response.Header().Get("Location")
	}
	if !strings.Contains(target, "SAMLRequest=") {
		t.Fatalf("start: %d %s", response.Code, response.Body.String())
	}
	browser := ""
	for _, cookie := range response.Result().Cookies() {
		if cookie.Name == samlBrowserCookie {
			if !cookie.Secure || !cookie.HttpOnly || cookie.SameSite != http.SameSiteNoneMode {
				t.Fatal("unsafe flow cookie")
			}
			browser = cookie.Name + "=" + cookie.Value
		}
	}
	return f.assertion(t, httptest.NewRequest(http.MethodGet, target, nil)), browser
}

func (f *samlSecurityFixture) assertion(t *testing.T, request *http.Request) *saml.IdpAuthnRequest {
	t.Helper()
	req, err := saml.NewIdpAuthnRequest(f.idp, request)
	if err != nil {
		t.Fatal(err)
	}
	if err := xml.Unmarshal(req.RequestBuffer, &req.Request); err != nil {
		t.Fatal(err)
	}
	metadata := performJSONRequest(t, f.app, http.MethodGet, "/auth/saml2/metadata/"+intToString(f.workspace), nil, "")
	var sp saml.EntityDescriptor
	if err := xml.Unmarshal(metadata.Body.Bytes(), &sp); err != nil {
		t.Fatal(err)
	}
	req.ServiceProviderMetadata = &sp
	req.SPSSODescriptor = &sp.SPSSODescriptors[0]
	req.ACSEndpoint = &req.SPSSODescriptor.AssertionConsumerServices[0]
	err = saml.DefaultAssertionMaker{}.MakeAssertion(req, &saml.Session{ID: "idp-session", NameID: "stable-user", NameIDFormat: string(saml.PersistentNameIDFormat), UserEmail: f.email, UserName: "SSO User", CreateTime: time.Now()})
	if err != nil {
		t.Fatal(err)
	}
	return req
}

func (f *samlSecurityFixture) post(t *testing.T, req *saml.IdpAuthnRequest, cookie string) *httptest.ResponseRecorder {
	t.Helper()
	form, err := req.PostBinding()
	if err != nil {
		t.Fatal(err)
	}
	return f.postForm(form, cookie)
}

func (f *samlSecurityFixture) postForm(form saml.IdpAuthnRequestForm, cookie string) *httptest.ResponseRecorder {
	values := url.Values{"SAMLResponse": {form.SAMLResponse}, "RelayState": {form.RelayState}}
	request := httptest.NewRequest(http.MethodPost, form.URL, strings.NewReader(values.Encode()))
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	request.Header.Set("Cookie", cookie)
	request.Header.Set("Origin", "https://idp.example.net")
	response := httptest.NewRecorder()
	f.app.HTTP.ServeHTTP(response, request)
	return response
}
