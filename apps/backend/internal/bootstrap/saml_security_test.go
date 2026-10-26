package bootstrap

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/crewjam/saml"
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	identitysaml "opentoggl/backend/apps/backend/internal/identity/saml"
)

func TestSAMLSignedIdentityLifecycle(t *testing.T) {
	f := newSAMLSecurityFixture(t)
	req, cookie := f.start(t, false)
	if result := f.post(t, req, cookie); result.Header().Get("Location") != "/login?sso_error=account_exists" {
		t.Fatalf("malicious email assertion: %d %s %s", result.Code, result.Header().Get("Location"), result.Body.String())
	}
	req, cookie = f.start(t, true)
	if result := f.post(t, req, cookie+"; "+f.cookie); result.Header().Get("Location") != "/profile?sso_linked=1" {
		t.Fatalf("link: %d %s %s", result.Code, result.Header().Get("Location"), result.Body.String())
	}
	req, cookie = f.start(t, false)
	result := f.post(t, req, cookie)
	if result.Header().Get("Location") != "/" {
		t.Fatalf("bound login: %d %s", result.Code, result.Header().Get("Location"))
	}
	sessionCookie := ""
	for _, c := range result.Result().Cookies() {
		if c.Name == "opentoggl_session" {
			sessionCookie = c.Name + "=" + c.Value
		}
	}
	if sessionCookie == "" {
		t.Fatalf("no login session: %v", result.Result().Cookies())
	}
	if replay := f.post(t, req, cookie); replay.Header().Get("Location") != "/login?sso_error=invalid_callback" {
		t.Fatal("replay accepted")
	}
	body := struct {
		Password string `json:"password"`
	}{Password: "secret1"}
	unlink := performJSONRequest(t, f.app, http.MethodDelete, "/web/v1/workspaces/"+intToString(f.workspace)+"/sso-identity", body, sessionCookie)
	if unlink.Code != 204 {
		t.Fatalf("unlink: %d %s", unlink.Code, unlink.Body.String())
	}
	var count int
	if err := f.db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM identity_sessions`).Scan(&count); err != nil || count != 0 {
		t.Fatalf("sessions survived unlink: %d %v", count, err)
	}
}

func TestSAMLCallbackRejectsUnboundBrowserAndBadAssertions(t *testing.T) {
	f := newSAMLSecurityFixture(t)
	req, cookie := f.start(t, false)
	if result := f.post(t, req, samlBrowserCookie+"="+strings.Repeat("b", 64)); result.Header().Get("Location") != "/login?sso_error=invalid_callback" {
		t.Fatal("wrong browser accepted")
	}
	if result := f.post(t, req, cookie); result.Header().Get("Location") != "/login?sso_error=account_exists" {
		t.Fatal("wrong browser consumed legitimate state")
	}
	cases := []struct {
		name   string
		mutate func(*saml.IdpAuthnRequest)
	}{
		{"signature", func(r *saml.IdpAuthnRequest) {
			key, err := identitysaml.GenerateKeypair()
			if err != nil {
				t.Fatal(err)
			}
			other := *r.IDP
			other.Key = key.Key
			other.Certificate = key.Certificate
			r.IDP = &other
		}},
		{"audience", func(r *saml.IdpAuthnRequest) {
			r.Assertion.Conditions.AudienceRestrictions[0].Audience.Value = "https://other.example"
		}},
		{"issuer", func(r *saml.IdpAuthnRequest) { r.Assertion.Issuer.Value = "https://other.example" }},
		{"request", func(r *saml.IdpAuthnRequest) {
			r.Assertion.Subject.SubjectConfirmations[0].SubjectConfirmationData.InResponseTo = "other"
		}},
		{"transient", func(r *saml.IdpAuthnRequest) { r.Assertion.Subject.NameID.Format = string(saml.TransientNameIDFormat) }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req, cookie := f.start(t, false)
			tc.mutate(req)
			result := f.post(t, req, cookie)
			if result.Header().Get("Location") != "/login?sso_error=verification_failed" {
				t.Fatalf("invalid assertion: %s", result.Header().Get("Location"))
			}
		})
	}
}

func TestSAMLConcurrentReplayAndAuthoritativeSession(t *testing.T) {
	f := newSAMLSecurityFixture(t)
	req, cookie := f.start(t, false)
	form, err := req.PostBinding()
	if err != nil {
		t.Fatal(err)
	}
	var accepted atomic.Int32
	var wg sync.WaitGroup
	for range 4 {
		wg.Go(func() {
			if f.postForm(form, cookie).Header().Get("Location") == "/login?sso_error=account_exists" {
				accepted.Add(1)
			}
		})
	}
	wg.Wait()
	if accepted.Load() != 1 {
		t.Fatalf("consumed %d times", accepted.Load())
	}
	repo := identitypostgres.NewSessionRepository(f.db.Pool)
	var uid int64
	if err := f.db.Pool.QueryRow(context.Background(), `SELECT id FROM identity_users LIMIT 1`).Scan(&uid); err != nil {
		t.Fatal(err)
	}
	cached := newCachedSessionRepository(repo, f.app.Platform.Cache)
	sid := "stale-cache-test"
	if err := repo.Put(context.Background(), identityapplication.Session{ID: sid, UserID: uid}); err != nil {
		t.Fatal(err)
	}
	if err := f.app.Platform.Cache.Set(context.Background(), "session:"+sid, uid, time.Minute); err != nil {
		t.Fatal(err)
	}
	if err := repo.Delete(context.Background(), sid); err != nil {
		t.Fatal(err)
	}
	if _, err := cached.UserIDBySession(context.Background(), sid); err == nil {
		t.Fatal("Redis authorized revoked session")
	}
}

func TestSAMLConfigurationChangeInvalidatesConsent(t *testing.T) {
	f := newSAMLSecurityFixture(t)
	req, cookie := f.start(t, true)
	if result := f.post(t, req, cookie); result.Header().Get("Location") != "/profile?sso_linked=1" {
		t.Fatal("link failed")
	}
	req, cookie = f.start(t, false)
	path := "/web/v1/workspaces/" + intToString(f.workspace) + "/sso-config"
	get := performJSONRequest(t, f.app, http.MethodGet, path, nil, f.cookie)
	var config webapi.WorkspaceSsoConfig
	mustDecodeJSON(t, get.Body.Bytes(), &config)
	update := webapi.WorkspaceSsoConfigUpdate{Revision: config.Revision, Enabled: true, ProfileName: config.ProfileName, EmailDomain: config.EmailDomain, IdpEntityId: config.IdpEntityId, IdpSsoUrl: "https://replacement.example.net/sso", IdpCertificate: config.IdpCertificate}
	saved := performJSONRequest(t, f.app, http.MethodPut, path, update, f.cookie)
	if saved.Code != 200 {
		t.Fatalf("save: %d %s", saved.Code, saved.Body.String())
	}
	if stale := performJSONRequest(t, f.app, http.MethodPut, path, update, f.cookie); stale.Code != 409 {
		t.Fatalf("stale update: %d", stale.Code)
	}
	if result := f.post(t, req, cookie); result.Header().Get("Location") != "/login?sso_error=configuration_changed" {
		t.Fatal("old configuration flow survived")
	}
	var count int
	if err := f.db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM identity_saml_bindings`).Scan(&count); err != nil || count != 0 {
		t.Fatalf("old consent survived provider change: %d %v", count, err)
	}
}
