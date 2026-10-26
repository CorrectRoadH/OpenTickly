package application_test

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"

	"opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func ssoFixture(t *testing.T) (*pgtest.Database, *application.Service, application.SSOIdentity) {
	t.Helper()
	db := pgtest.OpenEphemeral(t)
	config := newPostgresTestDependencies(db).Config()
	config.SSO = identitypostgres.NewSSORepository(db.Pool)
	ctx := context.Background()
	var org, workspace int64
	if err := db.Pool.QueryRow(ctx, `INSERT INTO tenant_organizations(name) VALUES('SSO test') RETURNING id`).Scan(&org); err != nil {
		t.Fatal(err)
	}
	if err := db.Pool.QueryRow(ctx, `INSERT INTO tenant_workspaces(name,organization_id) VALUES('SSO test',$1) RETURNING id`, org).Scan(&workspace); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Pool.Exec(ctx, `INSERT INTO tenant_workspace_sso_config(workspace_id,enabled,profile_name,email_domain) VALUES($1,true,'Test','example.com')`, workspace); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Pool.Exec(ctx, `INSERT INTO instance_admin_registration_policy(id,mode) VALUES(1,'open'); INSERT INTO instance_admin_config(id,email_verification_required) VALUES(1,false)`); err != nil {
		t.Fatal(err)
	}
	return db, application.NewService(config), application.SSOIdentity{WorkspaceID: workspace, Revision: 1, IdentityRevision: 1, SubjectKey: strings.Repeat("a", 64), Email: "new@example.com", FullName: "SSO User"}
}

func TestSSORejectsExistingEmailWithoutIdentityBinding(t *testing.T) {
	_, service, identity := ssoFixture(t)
	ctx := context.Background()
	_, err := service.Register(ctx, application.RegisterInput{Email: identity.Email, FullName: "Local User", Password: "secret1"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.LoginOrProvisionSSO(ctx, identity); !errors.Is(err, application.ErrSSOAccountExists) {
		t.Fatalf("unbound IdP must not authenticate existing email: %v", err)
	}
}

func TestSSOExplicitLinkLoginAndUnlink(t *testing.T) {
	db, service, identity := ssoFixture(t)
	ctx := context.Background()
	registered, err := service.Register(ctx, application.RegisterInput{Email: identity.Email, FullName: "Local User", Password: "secret1"})
	if err != nil {
		t.Fatal(err)
	}
	uid, sid := registered.Session.User.ID, registered.Session.SessionID
	if _, err := db.Pool.Exec(ctx, `INSERT INTO membership_workspace_members(workspace_id,user_id,email,role,state) VALUES($1,$2,$3,'member','joined')`, identity.WorkspaceID, uid, identity.Email); err != nil {
		t.Fatal(err)
	}
	link := application.SSOLinkWrite{Identity: identity, UserID: uid, SessionID: sid}
	link.SessionID = "revoked"
	if err := service.LinkSSO(ctx, link); !errors.Is(err, application.ErrSessionNotFound) {
		t.Fatalf("revoked link: %v", err)
	}
	link.SessionID = sid
	if err := service.LinkSSO(ctx, link); err != nil {
		t.Fatal(err)
	}
	identity.Email = "different@attacker.test"
	login, err := service.LoginOrProvisionSSO(ctx, identity)
	if err != nil || login.Session.User.ID != uid || login.Session.User.Email != "new@example.com" {
		t.Fatalf("bound subject must select original user regardless of email: %+v %v", login, err)
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE membership_workspace_members SET state='removed' WHERE workspace_id=$1`, identity.WorkspaceID); err != nil {
		t.Fatal(err)
	}
	bindings, err := service.ListSSO(ctx, uid)
	if err != nil || len(bindings) != 1 {
		t.Fatalf("removed member must retain own binding visibility: %v", err)
	}
	unlink := application.SSOUnlinkWrite{WorkspaceID: identity.WorkspaceID, UserID: uid, SessionID: sid, Password: "wrong"}
	if err := service.UnlinkSSO(ctx, unlink); !errors.Is(err, domain.ErrInvalidCredentials) {
		t.Fatalf("wrong password: %v", err)
	}
	unlink.Password = "secret1"
	if err := service.UnlinkSSO(ctx, unlink); err != nil {
		t.Fatal(err)
	}
	for _, token := range []string{sid, login.Session.SessionID} {
		if _, err := service.ResolveCurrentUser(ctx, token); !errors.Is(err, application.ErrSessionNotFound) {
			t.Fatalf("session survived unlink: %v", err)
		}
	}
	bindings, err = service.ListSSO(ctx, uid)
	if err != nil || len(bindings) != 0 {
		t.Fatalf("binding survived unlink: %v", err)
	}
}

func TestSSOProvisioningPolicyAndRevision(t *testing.T) {
	db, service, identity := ssoFixture(t)
	ctx := context.Background()
	cases := []struct {
		sql  string
		want error
	}{
		{`UPDATE instance_admin_registration_policy SET mode='closed'`, application.ErrRegistrationClosed},
		{`UPDATE instance_admin_registration_policy SET mode='open'; UPDATE instance_admin_config SET email_verification_required=true`, application.ErrSSOVerificationRequired},
		{`UPDATE instance_admin_config SET email_verification_required=false; UPDATE tenant_workspace_sso_config SET revision=2`, application.ErrSSOConfigurationChanged},
	}
	for _, test := range cases {
		if _, err := db.Pool.Exec(ctx, test.sql); err != nil {
			t.Fatal(err)
		}
		if _, err := service.LoginOrProvisionSSO(ctx, identity); !errors.Is(err, test.want) {
			t.Fatalf("want %v got %v", test.want, err)
		}
	}
	identity.Revision = 2
	result, err := service.LoginOrProvisionSSO(ctx, identity)
	if err != nil || !result.Provisioned {
		t.Fatalf("provision: %v", err)
	}
	if err := service.Deactivate(ctx, result.Session.User.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := service.LoginOrProvisionSSO(ctx, identity); !errors.Is(err, domain.ErrUserDeactivated) {
		t.Fatalf("inactive: %v", err)
	}
}

func TestSSOConcurrentProvisioningCreatesOneBinding(t *testing.T) {
	db, service, identity := ssoFixture(t)
	var wg sync.WaitGroup
	ids := make(chan int64, 4)
	for range 4 {
		wg.Go(func() {
			result, err := service.LoginOrProvisionSSO(context.Background(), identity)
			if err != nil {
				t.Error(err)
				return
			}
			ids <- result.Session.User.ID
		})
	}
	wg.Wait()
	close(ids)
	var expected int64
	for id := range ids {
		if expected != 0 && id != expected {
			t.Error("multiple users provisioned")
		}
		expected = id
	}
	var count int
	if err := db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM identity_saml_bindings`).Scan(&count); err != nil || count != 1 {
		t.Fatalf("binding count %d: %v", count, err)
	}
}
