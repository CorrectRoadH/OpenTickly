package bootstrap

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	openapi_types "github.com/oapi-codegen/runtime/types"
	"github.com/samber/lo"
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestOrganizationDeletionRecoversSession(t *testing.T) {
	for _, remaining := range []bool{false, true} {
		t.Run(fmt.Sprintf("remaining=%t", remaining), func(t *testing.T) {
			database := pgtest.Open(t)
			app, err := NewApp(Config{ServiceName: "opentoggl-api", Server: ServerConfig{ListenAddress: ":0"}, Database: DatabaseConfig{PrimaryDSN: database.ConnString()}, Redis: RedisConfig{Address: "redis://127.0.0.1:6379/0"}})
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(app.Platform.Database.Close)
			email := uniqueTestEmail("delete-home")
			register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", webapi.RegisterRequest{Email: openapi_types.Email(email), Password: "secret1", Fullname: lo.ToPtr("Deletion User")}, "")
			if register.Code != http.StatusCreated {
				t.Fatalf("register: %d %s", register.Code, register.Body.String())
			}
			var initial webapi.SessionBootstrap
			mustDecodeJSON(t, register.Body.Bytes(), &initial)
			cookie := register.Header().Get("Set-Cookie")
			var retainedWorkspace int
			if remaining {
				// A second real user owns the retained workspace; recovery must not promote our user.
				other := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", webapi.RegisterRequest{Email: openapi_types.Email(uniqueTestEmail("retained-owner")), Password: "secret1", Fullname: lo.ToPtr("Deletion User")}, "")
				if other.Code != http.StatusCreated {
					t.Fatalf("other register: %d %s", other.Code, other.Body.String())
				}
				var retained webapi.SessionBootstrap
				mustDecodeJSON(t, other.Body.Bytes(), &retained)
				retainedWorkspace = *retained.CurrentWorkspaceId
				_, err = database.Pool.Exec(context.Background(), `INSERT INTO membership_workspace_members (workspace_id,user_id,email,full_name,role,state,created_by) VALUES ($1,$2,$3,'Member','member','joined',$4)`, retainedWorkspace, initial.User.Id, email, retained.User.Id)
				if err != nil {
					t.Fatal(err)
				}
			}
			deleted := performJSONRequest(t, app, http.MethodDelete, fmt.Sprintf("/web/v1/organizations/%d", *initial.CurrentOrganizationId), nil, cookie)
			if deleted.Code != http.StatusNoContent {
				t.Fatalf("delete: %d %s", deleted.Code, deleted.Body.String())
			}
			for _, login := range []bool{false, true} {
				response := performJSONRequest(t, app, http.MethodGet, "/web/v1/session", nil, cookie)
				if login {
					response = performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/login", webapi.LoginRequest{Email: email, Password: "secret1"}, "")
				}
				if response.Code != http.StatusOK {
					t.Fatalf("session login=%t: %d %s", login, response.Code, response.Body.String())
				}
				var recovered webapi.SessionBootstrap
				mustDecodeJSON(t, response.Body.Bytes(), &recovered)
				if recovered.CurrentWorkspaceId == nil || recovered.CurrentOrganizationId == nil || *recovered.CurrentOrganizationId == *initial.CurrentOrganizationId {
					t.Fatal("session still references the deleted organization")
				}
				if recovered.User.DefaultWorkspaceId != *recovered.CurrentWorkspaceId {
					t.Fatalf("stale default: %d current %d", recovered.User.DefaultWorkspaceId, *recovered.CurrentWorkspaceId)
				}
				if len(recovered.Organizations) != 1 || len(recovered.Workspaces) != 1 {
					t.Fatal("unexpected extra organization or workspace")
				}
				if remaining && *recovered.CurrentWorkspaceId != retainedWorkspace {
					t.Fatalf("did not reuse remaining workspace")
				}
				if retainedWorkspace == 0 {
					retainedWorkspace = *recovered.CurrentWorkspaceId
				}
				if *recovered.CurrentWorkspaceId != retainedWorkspace {
					t.Fatal("repeated recovery created another workspace")
				}
			}
			if remaining {
				var role string
				if err := database.Pool.QueryRow(context.Background(), `SELECT role FROM membership_workspace_members WHERE workspace_id=$1 AND user_id=$2`, retainedWorkspace, initial.User.Id).Scan(&role); err != nil {
					t.Fatal(err)
				}
				if role != "member" {
					t.Fatalf("recovery promoted member to %s", role)
				}
			}
		})
	}
}
