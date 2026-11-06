package postgres_test

import (
	"context"
	"errors"
	"testing"

	"opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

const testIssuer = "https://accounts.google.com"

func seedOIDCConfig(t *testing.T, db *pgtest.Database, enabled bool) {
	t.Helper()
	if _, err := db.Pool.Exec(context.Background(), `INSERT INTO instance_admin_oidc_config (id, enabled, issuer_url, client_id, client_secret) VALUES (1, $1, $2, 'cid', 'secret')
		ON CONFLICT (id) DO UPDATE SET enabled = EXCLUDED.enabled, issuer_url = EXCLUDED.issuer_url`, enabled, testIssuer); err != nil {
		t.Fatalf("seed oidc config: %v", err)
	}
}

func seedUser(t *testing.T, db *pgtest.Database, id int64, email string) {
	t.Helper()
	user, err := domain.RegisterUser(domain.RegisterParams{ID: id, Email: email, FullName: "Seed", Password: "password-1", APIToken: "tok-" + email, Timezone: "UTC"})
	if err != nil {
		t.Fatalf("build user: %v", err)
	}
	if err := identitypostgres.NewUserRepository(db.Pool).Save(context.Background(), user); err != nil {
		t.Fatalf("save user: %v", err)
	}
}

func newUser(t *testing.T, id int64, email string) *domain.User {
	t.Helper()
	user, err := domain.RegisterUser(domain.RegisterParams{ID: id, Email: email, FullName: "Provisioned", Password: "random-password", APIToken: "tok-new-" + email, Timezone: "UTC"})
	if err != nil {
		t.Fatalf("build new user: %v", err)
	}
	return user
}

func TestOIDCLoginLinksVerifiedEmailThenReusesBinding(t *testing.T) {
	db := pgtest.OpenEphemeral(t)
	ctx := context.Background()
	seedOIDCConfig(t, db, true)
	seedUser(t, db, 7001, "yuri@example.com")
	repo := identitypostgres.NewOIDCRepository(db.Pool)

	identity := application.OIDCIdentity{Issuer: testIssuer, Subject: "sub-1", Email: "Yuri@Example.com", EmailVerified: true}
	first, err := repo.Login(ctx, application.OIDCLoginWrite{Identity: identity, AllowEmailLink: true, SessionID: "sess-1"})
	if err != nil {
		t.Fatalf("first login: %v", err)
	}
	if !first.Linked || first.Provisioned || first.User.ID() != 7001 {
		t.Fatalf("expected link to existing user, got %+v", first)
	}

	// Second login must resolve through the binding even if the email changed
	// at the provider and linking is no longer allowed.
	identity.Email = "other@elsewhere.com"
	second, err := repo.Login(ctx, application.OIDCLoginWrite{Identity: identity, AllowEmailLink: false, SessionID: "sess-2"})
	if err != nil {
		t.Fatalf("second login: %v", err)
	}
	if second.Linked || second.Provisioned || second.User.ID() != 7001 {
		t.Fatalf("expected binding reuse, got %+v", second)
	}
	var owner int64
	if err := db.Pool.QueryRow(ctx, `SELECT user_id FROM identity_sessions WHERE id='sess-2'`).Scan(&owner); err != nil || owner != 7001 {
		t.Fatalf("session not issued: owner=%d err=%v", owner, err)
	}
}

func TestOIDCLoginProvisionsWhenAllowed(t *testing.T) {
	db := pgtest.OpenEphemeral(t)
	ctx := context.Background()
	seedOIDCConfig(t, db, true)
	repo := identitypostgres.NewOIDCRepository(db.Pool)

	identity := application.OIDCIdentity{Issuer: testIssuer, Subject: "sub-new", Email: "new@example.com", EmailVerified: true}
	result, err := repo.Login(ctx, application.OIDCLoginWrite{Identity: identity, AllowEmailLink: true, NewUser: newUser(t, 7100, "new@example.com"), SessionID: "sess-new"})
	if err != nil {
		t.Fatalf("provision: %v", err)
	}
	if !result.Provisioned || result.User.ID() != 7100 {
		t.Fatalf("expected provisioning, got %+v", result)
	}
}

func TestOIDCLoginRejectsUnknownIdentityWithoutProvisioning(t *testing.T) {
	db := pgtest.OpenEphemeral(t)
	ctx := context.Background()
	seedOIDCConfig(t, db, true)
	repo := identitypostgres.NewOIDCRepository(db.Pool)

	identity := application.OIDCIdentity{Issuer: testIssuer, Subject: "sub-x", Email: "nobody@example.com", EmailVerified: true}
	_, err := repo.Login(ctx, application.OIDCLoginWrite{Identity: identity, AllowEmailLink: true, SessionID: "sess-x"})
	if !errors.Is(err, application.ErrOIDCAccountNotFound) {
		t.Fatalf("expected account not found, got %v", err)
	}

	seedUser(t, db, 7200, "nobody@example.com")
	_, err = repo.Login(ctx, application.OIDCLoginWrite{Identity: identity, AllowEmailLink: false, SessionID: "sess-y"})
	if !errors.Is(err, application.ErrOIDCAccountNotFound) {
		t.Fatalf("link must be refused when the application disallowed it, got %v", err)
	}
	var count int
	if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM identity_oidc_bindings`).Scan(&count); err != nil || count != 0 {
		t.Fatalf("no binding may be written on rejection, count=%d err=%v", count, err)
	}
}

func TestOIDCLoginFailsClosedWhenDisabledOrIssuerDiffers(t *testing.T) {
	db := pgtest.OpenEphemeral(t)
	ctx := context.Background()
	repo := identitypostgres.NewOIDCRepository(db.Pool)
	identity := application.OIDCIdentity{Issuer: testIssuer, Subject: "sub", Email: "a@example.com", EmailVerified: true}

	if _, err := repo.Login(ctx, application.OIDCLoginWrite{Identity: identity, AllowEmailLink: true, SessionID: "s0"}); !errors.Is(err, application.ErrSSOConfigurationChanged) {
		t.Fatalf("no config row must fail closed, got %v", err)
	}
	seedOIDCConfig(t, db, false)
	if _, err := repo.Login(ctx, application.OIDCLoginWrite{Identity: identity, AllowEmailLink: true, SessionID: "s1"}); !errors.Is(err, application.ErrSSOConfigurationChanged) {
		t.Fatalf("disabled config must fail closed, got %v", err)
	}
	seedOIDCConfig(t, db, true)
	identity.Issuer = "https://other.example"
	if _, err := repo.Login(ctx, application.OIDCLoginWrite{Identity: identity, AllowEmailLink: true, SessionID: "s2"}); !errors.Is(err, application.ErrSSOConfigurationChanged) {
		t.Fatalf("issuer mismatch must fail closed, got %v", err)
	}
}

func TestOIDCLoginRejectsSecondIdentityForSameUser(t *testing.T) {
	db := pgtest.OpenEphemeral(t)
	ctx := context.Background()
	seedOIDCConfig(t, db, true)
	seedUser(t, db, 7300, "dup@example.com")
	repo := identitypostgres.NewOIDCRepository(db.Pool)

	base := application.OIDCIdentity{Issuer: testIssuer, Subject: "sub-a", Email: "dup@example.com", EmailVerified: true}
	if _, err := repo.Login(ctx, application.OIDCLoginWrite{Identity: base, AllowEmailLink: true, SessionID: "s1"}); err != nil {
		t.Fatalf("first link: %v", err)
	}
	base.Subject = "sub-b"
	if _, err := repo.Login(ctx, application.OIDCLoginWrite{Identity: base, AllowEmailLink: true, SessionID: "s2"}); !errors.Is(err, application.ErrSSOBindingTaken) {
		t.Fatalf("a second subject for the same user must be rejected, got %v", err)
	}
}
