package bootstrap

import (
	"fmt"
	"net/http"
	"testing"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"

	"github.com/samber/lo"
)

func TestProjectGroupsPublicRouteRoundTrip(t *testing.T) {
	database := pgtest.OpenEphemeral(t)
	cfg := mustStartupConfigFromRepositoryEnv(t)
	cfg.Database.PrimaryDSN = database.ConnString()
	app, err := NewApp(cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Platform.Database.Close)
	t.Cleanup(func() {
		if err := app.Platform.Cache.Close(); err != nil {
			t.Error(err)
		}
	})
	user := registerAuditUser(t, app)
	projectID := createAuditProject(t, app, user, "Team project")
	groupResponse := performAuthorizedJSONRequest(t, app, http.MethodPost,
		fmt.Sprintf("/api/v9/workspaces/%d/groups", user.WorkspaceID),
		struct {
			Name string `json:"name"`
		}{"Engineering"}, user.Authorization)
	if groupResponse.Code != http.StatusOK {
		t.Fatalf("create group: %d %s", groupResponse.Code, groupResponse.Body)
	}
	var group struct {
		ID int `json:"id"`
	}
	mustDecodeJSON(t, groupResponse.Body.Bytes(), &group)
	path := fmt.Sprintf("/api/v9/workspaces/%d/project_groups", user.WorkspaceID)
	assigned := performAuthorizedJSONRequest(t, app, http.MethodPost, path,
		publictrackapi.GroupProjectGroupPayload{ProjectId: lo.ToPtr(int(projectID)), GroupId: &group.ID}, user.Authorization)
	if assigned.Code != http.StatusOK {
		t.Fatalf("assign group: %d %s", assigned.Code, assigned.Body)
	}
	listed := performAuthorizedJSONRequest(t, app, http.MethodGet,
		fmt.Sprintf("%s?project_ids=%d", path, projectID), nil, user.Authorization)
	if listed.Code != http.StatusOK {
		t.Fatalf("list groups: %d %s", listed.Code, listed.Body)
	}
	var groups []publictrackapi.ModelsProjectGroup
	mustDecodeJSON(t, listed.Body.Bytes(), &groups)
	if len(groups) != 1 || lo.FromPtr(groups[0].GroupId) != group.ID {
		t.Fatalf("unexpected groups: %+v", groups)
	}
	removed := performAuthorizedJSONRequest(t, app, http.MethodDelete,
		fmt.Sprintf("%s/%d", path, lo.FromPtr(groups[0].Id)), nil, user.Authorization)
	if removed.Code != http.StatusOK {
		t.Fatalf("delete group: %d %s", removed.Code, removed.Body)
	}
	listed = performAuthorizedJSONRequest(t, app, http.MethodGet,
		fmt.Sprintf("%s?project_ids=%d", path, projectID), nil, user.Authorization)
	if listed.Code != http.StatusOK {
		t.Fatalf("list after delete: %d %s", listed.Code, listed.Body)
	}
	mustDecodeJSON(t, listed.Body.Bytes(), &groups)
	if len(groups) != 0 {
		t.Fatalf("assignment survived deletion: %+v", groups)
	}
}
