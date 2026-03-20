package bootstrap

import "net/http"

import "testing"

func TestWave2PlaceholderRoutesServeCurrentRuntimeSlice(t *testing.T) {
	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server: ServerConfig{
			ListenAddress: ":0",
		},
	})
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    "wave2-placeholder@example.com",
		"fullname": "Wave Two Placeholder",
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
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &bootstrapResponse)
	if bootstrapResponse.CurrentWorkspaceID == nil || *bootstrapResponse.CurrentWorkspaceID <= 0 {
		t.Fatalf("expected current workspace id > 0, got %#v", bootstrapResponse.CurrentWorkspaceID)
	}

	workspaceID := *bootstrapResponse.CurrentWorkspaceID

	workspaceMembers := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/workspaces/"+intToString(workspaceID)+"/members",
		nil,
		sessionCookie,
	)
	if workspaceMembers.Code != http.StatusOK {
		t.Fatalf("expected workspace members status 200, got %d body=%s", workspaceMembers.Code, workspaceMembers.Body.String())
	}
	var workspaceMembersBody struct {
		Members []struct {
			ID          int64  `json:"id"`
			WorkspaceID int64  `json:"workspace_id"`
			Email       string `json:"email"`
			Name        string `json:"name"`
			Role        string `json:"role"`
		} `json:"members"`
	}
	mustDecodeJSON(t, workspaceMembers.Body.Bytes(), &workspaceMembersBody)
	if len(workspaceMembersBody.Members) == 0 {
		t.Fatal("expected at least one workspace member in placeholder response")
	}
	if workspaceMembersBody.Members[0].WorkspaceID != workspaceID {
		t.Fatalf("expected workspace member to echo workspace id %d, got %d", workspaceID, workspaceMembersBody.Members[0].WorkspaceID)
	}

	invite := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/web/v1/workspaces/"+intToString(workspaceID)+"/members/invitations",
		map[string]any{
			"email": "new.member@example.com",
		},
		sessionCookie,
	)
	if invite.Code != http.StatusCreated {
		t.Fatalf("expected invite status 201, got %d body=%s", invite.Code, invite.Body.String())
	}
	var invitedMember struct {
		ID          int64  `json:"id"`
		WorkspaceID int64  `json:"workspace_id"`
		Email       string `json:"email"`
		Name        string `json:"name"`
		Role        string `json:"role"`
	}
	mustDecodeJSON(t, invite.Body.Bytes(), &invitedMember)
	if invitedMember.Email != "new.member@example.com" {
		t.Fatalf("expected invited member email to round-trip, got %q", invitedMember.Email)
	}

	workspaceMembersAfterInvite := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/workspaces/"+intToString(workspaceID)+"/members",
		nil,
		sessionCookie,
	)
	if workspaceMembersAfterInvite.Code != http.StatusOK {
		t.Fatalf(
			"expected workspace members-after-invite status 200, got %d body=%s",
			workspaceMembersAfterInvite.Code,
			workspaceMembersAfterInvite.Body.String(),
		)
	}
	var workspaceMembersAfterInviteBody struct {
		Members []struct {
			Email string `json:"email"`
		} `json:"members"`
	}
	mustDecodeJSON(t, workspaceMembersAfterInvite.Body.Bytes(), &workspaceMembersAfterInviteBody)
	foundInvitedMember := false
	for _, member := range workspaceMembersAfterInviteBody.Members {
		if member.Email == invitedMember.Email {
			foundInvitedMember = true
			break
		}
	}
	if !foundInvitedMember {
		t.Fatalf("expected invited member %q to appear in workspace list", invitedMember.Email)
	}

	projects := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/projects?workspace_id="+intToString(workspaceID),
		nil,
		sessionCookie,
	)
	if projects.Code != http.StatusOK {
		t.Fatalf("expected projects status 200, got %d body=%s", projects.Code, projects.Body.String())
	}
	var projectsBody struct {
		Projects []struct {
			ID          int64  `json:"id"`
			Name        string `json:"name"`
			WorkspaceID int64  `json:"workspace_id"`
			Active      bool   `json:"active"`
		} `json:"projects"`
	}
	mustDecodeJSON(t, projects.Body.Bytes(), &projectsBody)
	if len(projectsBody.Projects) == 0 {
		t.Fatal("expected at least one project in placeholder response")
	}
	if projectsBody.Projects[0].WorkspaceID != workspaceID {
		t.Fatalf("expected project to echo workspace id %d, got %d", workspaceID, projectsBody.Projects[0].WorkspaceID)
	}

	createProject := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/web/v1/projects",
		map[string]any{
			"workspace_id": workspaceID,
			"name":         "Launch Website",
		},
		sessionCookie,
	)
	if createProject.Code != http.StatusCreated {
		t.Fatalf("expected create project status 201, got %d body=%s", createProject.Code, createProject.Body.String())
	}
	var createdProject struct {
		ID          int64  `json:"id"`
		WorkspaceID int64  `json:"workspace_id"`
		Name        string `json:"name"`
		Active      bool   `json:"active"`
	}
	mustDecodeJSON(t, createProject.Body.Bytes(), &createdProject)
	if createdProject.Name != "Launch Website" {
		t.Fatalf("expected created project name to round-trip, got %q", createdProject.Name)
	}

	projectsAfterCreate := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/projects?workspace_id="+intToString(workspaceID),
		nil,
		sessionCookie,
	)
	if projectsAfterCreate.Code != http.StatusOK {
		t.Fatalf(
			"expected projects-after-create status 200, got %d body=%s",
			projectsAfterCreate.Code,
			projectsAfterCreate.Body.String(),
		)
	}
	var projectsAfterCreateBody struct {
		Projects []struct {
			Name string `json:"name"`
		} `json:"projects"`
	}
	mustDecodeJSON(t, projectsAfterCreate.Body.Bytes(), &projectsAfterCreateBody)
	foundCreatedProject := false
	for _, project := range projectsAfterCreateBody.Projects {
		if project.Name == createdProject.Name {
			foundCreatedProject = true
			break
		}
	}
	if !foundCreatedProject {
		t.Fatalf("expected created project %q to appear in projects list", createdProject.Name)
	}

	projectMembers := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/projects/"+intToString(projectsBody.Projects[0].ID)+"/members",
		nil,
		sessionCookie,
	)
	if projectMembers.Code != http.StatusOK {
		t.Fatalf("expected project members status 200, got %d body=%s", projectMembers.Code, projectMembers.Body.String())
	}
	var projectMembersBody struct {
		Members []struct {
			ProjectID int64  `json:"project_id"`
			MemberID  int64  `json:"member_id"`
			Role      string `json:"role"`
		} `json:"members"`
	}
	mustDecodeJSON(t, projectMembers.Body.Bytes(), &projectMembersBody)
	if len(projectMembersBody.Members) == 0 {
		t.Fatal("expected at least one project member in placeholder response")
	}
	if projectMembersBody.Members[0].ProjectID != projectsBody.Projects[0].ID {
		t.Fatalf(
			"expected project member to echo project id %d, got %d",
			projectsBody.Projects[0].ID,
			projectMembersBody.Members[0].ProjectID,
		)
	}

	grantProjectMember := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/web/v1/projects/"+intToString(createdProject.ID)+"/members",
		map[string]any{
			"member_id": invitedMember.ID,
			"role":      "member",
		},
		sessionCookie,
	)
	if grantProjectMember.Code != http.StatusCreated {
		t.Fatalf(
			"expected project member grant status 201, got %d body=%s",
			grantProjectMember.Code,
			grantProjectMember.Body.String(),
		)
	}
	var grantedProjectMember struct {
		ProjectID int64  `json:"project_id"`
		MemberID  int64  `json:"member_id"`
		Role      string `json:"role"`
	}
	mustDecodeJSON(t, grantProjectMember.Body.Bytes(), &grantedProjectMember)
	if grantedProjectMember.ProjectID != createdProject.ID {
		t.Fatalf("expected granted project id %d, got %d", createdProject.ID, grantedProjectMember.ProjectID)
	}
	if grantedProjectMember.MemberID != invitedMember.ID {
		t.Fatalf("expected granted member id %d, got %d", invitedMember.ID, grantedProjectMember.MemberID)
	}

	projectMembersAfterGrant := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/projects/"+intToString(createdProject.ID)+"/members",
		nil,
		sessionCookie,
	)
	if projectMembersAfterGrant.Code != http.StatusOK {
		t.Fatalf(
			"expected project members-after-grant status 200, got %d body=%s",
			projectMembersAfterGrant.Code,
			projectMembersAfterGrant.Body.String(),
		)
	}
	var projectMembersAfterGrantBody struct {
		Members []struct {
			MemberID int64 `json:"member_id"`
		} `json:"members"`
	}
	mustDecodeJSON(t, projectMembersAfterGrant.Body.Bytes(), &projectMembersAfterGrantBody)
	foundGrantedMember := false
	for _, member := range projectMembersAfterGrantBody.Members {
		if member.MemberID == invitedMember.ID {
			foundGrantedMember = true
			break
		}
	}
	if !foundGrantedMember {
		t.Fatalf("expected granted member %d to appear in project list", invitedMember.ID)
	}

	revokeProjectMember := performJSONRequest(
		t,
		app,
		http.MethodDelete,
		"/web/v1/projects/"+intToString(createdProject.ID)+"/members/"+intToString(invitedMember.ID),
		nil,
		sessionCookie,
	)
	if revokeProjectMember.Code != http.StatusNoContent {
		t.Fatalf(
			"expected project member revoke status 204, got %d body=%s",
			revokeProjectMember.Code,
			revokeProjectMember.Body.String(),
		)
	}

	projectMembersAfterRevoke := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/projects/"+intToString(createdProject.ID)+"/members",
		nil,
		sessionCookie,
	)
	if projectMembersAfterRevoke.Code != http.StatusOK {
		t.Fatalf(
			"expected project members-after-revoke status 200, got %d body=%s",
			projectMembersAfterRevoke.Code,
			projectMembersAfterRevoke.Body.String(),
		)
	}
	var projectMembersAfterRevokeBody struct {
		Members []struct {
			MemberID int64 `json:"member_id"`
		} `json:"members"`
	}
	mustDecodeJSON(t, projectMembersAfterRevoke.Body.Bytes(), &projectMembersAfterRevokeBody)
	for _, member := range projectMembersAfterRevokeBody.Members {
		if member.MemberID == invitedMember.ID {
			t.Fatalf("expected revoked member %d to be removed from project list", invitedMember.ID)
		}
	}

	clients := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/clients?workspace_id="+intToString(workspaceID),
		nil,
		sessionCookie,
	)
	if clients.Code != http.StatusOK {
		t.Fatalf("expected clients status 200, got %d body=%s", clients.Code, clients.Body.String())
	}
	var clientsBody struct {
		Clients []struct {
			ID          int64  `json:"id"`
			Name        string `json:"name"`
			WorkspaceID int64  `json:"workspace_id"`
			Active      bool   `json:"active"`
		} `json:"clients"`
	}
	mustDecodeJSON(t, clients.Body.Bytes(), &clientsBody)
	if len(clientsBody.Clients) == 0 {
		t.Fatal("expected at least one client in placeholder response")
	}
	if clientsBody.Clients[0].WorkspaceID != workspaceID {
		t.Fatalf("expected client to echo workspace id %d, got %d", workspaceID, clientsBody.Clients[0].WorkspaceID)
	}

	createClient := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/web/v1/clients",
		map[string]any{
			"workspace_id": workspaceID,
			"name":         "Launch Partner",
		},
		sessionCookie,
	)
	if createClient.Code != http.StatusCreated {
		t.Fatalf("expected create client status 201, got %d body=%s", createClient.Code, createClient.Body.String())
	}
	var createdClient struct {
		ID          int64  `json:"id"`
		WorkspaceID int64  `json:"workspace_id"`
		Name        string `json:"name"`
		Active      bool   `json:"active"`
	}
	mustDecodeJSON(t, createClient.Body.Bytes(), &createdClient)
	if createdClient.Name != "Launch Partner" {
		t.Fatalf("expected created client name to round-trip, got %q", createdClient.Name)
	}

	clientsAfterCreate := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/clients?workspace_id="+intToString(workspaceID),
		nil,
		sessionCookie,
	)
	if clientsAfterCreate.Code != http.StatusOK {
		t.Fatalf(
			"expected clients-after-create status 200, got %d body=%s",
			clientsAfterCreate.Code,
			clientsAfterCreate.Body.String(),
		)
	}
	var clientsAfterCreateBody struct {
		Clients []struct {
			Name string `json:"name"`
		} `json:"clients"`
	}
	mustDecodeJSON(t, clientsAfterCreate.Body.Bytes(), &clientsAfterCreateBody)
	foundCreatedClient := false
	for _, client := range clientsAfterCreateBody.Clients {
		if client.Name == createdClient.Name {
			foundCreatedClient = true
			break
		}
	}
	if !foundCreatedClient {
		t.Fatalf("expected created client %q to appear in clients list", createdClient.Name)
	}

	tasks := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/tasks?workspace_id="+intToString(workspaceID),
		nil,
		sessionCookie,
	)
	if tasks.Code != http.StatusOK {
		t.Fatalf("expected tasks status 200, got %d body=%s", tasks.Code, tasks.Body.String())
	}
	var tasksBody struct {
		Tasks []struct {
			ID          int64  `json:"id"`
			Name        string `json:"name"`
			WorkspaceID int64  `json:"workspace_id"`
			Active      bool   `json:"active"`
		} `json:"tasks"`
	}
	mustDecodeJSON(t, tasks.Body.Bytes(), &tasksBody)
	if len(tasksBody.Tasks) == 0 {
		t.Fatal("expected at least one task in placeholder response")
	}
	if tasksBody.Tasks[0].WorkspaceID != workspaceID {
		t.Fatalf("expected task to echo workspace id %d, got %d", workspaceID, tasksBody.Tasks[0].WorkspaceID)
	}

	createTask := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/web/v1/tasks",
		map[string]any{
			"workspace_id": workspaceID,
			"name":         "Publish recap",
		},
		sessionCookie,
	)
	if createTask.Code != http.StatusCreated {
		t.Fatalf("expected create task status 201, got %d body=%s", createTask.Code, createTask.Body.String())
	}
	var createdTask struct {
		ID          int64  `json:"id"`
		WorkspaceID int64  `json:"workspace_id"`
		Name        string `json:"name"`
		Active      bool   `json:"active"`
	}
	mustDecodeJSON(t, createTask.Body.Bytes(), &createdTask)
	if createdTask.Name != "Publish recap" {
		t.Fatalf("expected created task name to round-trip, got %q", createdTask.Name)
	}

	tasksAfterCreate := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/tasks?workspace_id="+intToString(workspaceID),
		nil,
		sessionCookie,
	)
	if tasksAfterCreate.Code != http.StatusOK {
		t.Fatalf(
			"expected tasks-after-create status 200, got %d body=%s",
			tasksAfterCreate.Code,
			tasksAfterCreate.Body.String(),
		)
	}
	var tasksAfterCreateBody struct {
		Tasks []struct {
			Name string `json:"name"`
		} `json:"tasks"`
	}
	mustDecodeJSON(t, tasksAfterCreate.Body.Bytes(), &tasksAfterCreateBody)
	foundCreatedTask := false
	for _, task := range tasksAfterCreateBody.Tasks {
		if task.Name == createdTask.Name {
			foundCreatedTask = true
			break
		}
	}
	if !foundCreatedTask {
		t.Fatalf("expected created task %q to appear in tasks list", createdTask.Name)
	}

	tags := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/tags?workspace_id="+intToString(workspaceID),
		nil,
		sessionCookie,
	)
	if tags.Code != http.StatusOK {
		t.Fatalf("expected tags status 200, got %d body=%s", tags.Code, tags.Body.String())
	}
	var tagsBody struct {
		Tags []struct {
			ID          int64  `json:"id"`
			Name        string `json:"name"`
			WorkspaceID int64  `json:"workspace_id"`
			Active      bool   `json:"active"`
		} `json:"tags"`
	}
	mustDecodeJSON(t, tags.Body.Bytes(), &tagsBody)
	if len(tagsBody.Tags) == 0 {
		t.Fatal("expected at least one tag in placeholder response")
	}
	if tagsBody.Tags[0].WorkspaceID != workspaceID {
		t.Fatalf("expected tag to echo workspace id %d, got %d", workspaceID, tagsBody.Tags[0].WorkspaceID)
	}

	createTag := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/web/v1/tags",
		map[string]any{
			"workspace_id": workspaceID,
			"name":         "marketing",
		},
		sessionCookie,
	)
	if createTag.Code != http.StatusCreated {
		t.Fatalf("expected create tag status 201, got %d body=%s", createTag.Code, createTag.Body.String())
	}
	var createdTag struct {
		ID          int64  `json:"id"`
		WorkspaceID int64  `json:"workspace_id"`
		Name        string `json:"name"`
		Active      bool   `json:"active"`
	}
	mustDecodeJSON(t, createTag.Body.Bytes(), &createdTag)
	if createdTag.Name != "marketing" {
		t.Fatalf("expected created tag name to round-trip, got %q", createdTag.Name)
	}

	tagsAfterCreate := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/tags?workspace_id="+intToString(workspaceID),
		nil,
		sessionCookie,
	)
	if tagsAfterCreate.Code != http.StatusOK {
		t.Fatalf(
			"expected tags-after-create status 200, got %d body=%s",
			tagsAfterCreate.Code,
			tagsAfterCreate.Body.String(),
		)
	}
	var tagsAfterCreateBody struct {
		Tags []struct {
			Name string `json:"name"`
		} `json:"tags"`
	}
	mustDecodeJSON(t, tagsAfterCreate.Body.Bytes(), &tagsAfterCreateBody)
	foundCreatedTag := false
	for _, tag := range tagsAfterCreateBody.Tags {
		if tag.Name == createdTag.Name {
			foundCreatedTag = true
			break
		}
	}
	if !foundCreatedTag {
		t.Fatalf("expected created tag %q to appear in tags list", createdTag.Name)
	}

	groups := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/groups?workspace_id="+intToString(workspaceID),
		nil,
		sessionCookie,
	)
	if groups.Code != http.StatusOK {
		t.Fatalf("expected groups status 200, got %d body=%s", groups.Code, groups.Body.String())
	}
	var groupsBody struct {
		Groups []struct {
			ID          int64  `json:"id"`
			Name        string `json:"name"`
			WorkspaceID int64  `json:"workspace_id"`
			Active      bool   `json:"active"`
		} `json:"groups"`
	}
	mustDecodeJSON(t, groups.Body.Bytes(), &groupsBody)
	if len(groupsBody.Groups) == 0 {
		t.Fatal("expected at least one group in placeholder response")
	}
	if groupsBody.Groups[0].WorkspaceID != workspaceID {
		t.Fatalf("expected group to echo workspace id %d, got %d", workspaceID, groupsBody.Groups[0].WorkspaceID)
	}

	createGroup := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/web/v1/groups",
		map[string]any{
			"workspace_id": workspaceID,
			"name":         "Operations",
		},
		sessionCookie,
	)
	if createGroup.Code != http.StatusCreated {
		t.Fatalf("expected create group status 201, got %d body=%s", createGroup.Code, createGroup.Body.String())
	}
	var createdGroup struct {
		ID          int64  `json:"id"`
		WorkspaceID int64  `json:"workspace_id"`
		Name        string `json:"name"`
		Active      bool   `json:"active"`
	}
	mustDecodeJSON(t, createGroup.Body.Bytes(), &createdGroup)
	if createdGroup.Name != "Operations" {
		t.Fatalf("expected created group name to round-trip, got %q", createdGroup.Name)
	}

	groupsAfterCreate := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/groups?workspace_id="+intToString(workspaceID),
		nil,
		sessionCookie,
	)
	if groupsAfterCreate.Code != http.StatusOK {
		t.Fatalf(
			"expected groups-after-create status 200, got %d body=%s",
			groupsAfterCreate.Code,
			groupsAfterCreate.Body.String(),
		)
	}
	var groupsAfterCreateBody struct {
		Groups []struct {
			Name string `json:"name"`
		} `json:"groups"`
	}
	mustDecodeJSON(t, groupsAfterCreate.Body.Bytes(), &groupsAfterCreateBody)
	foundCreatedGroup := false
	for _, group := range groupsAfterCreateBody.Groups {
		if group.Name == createdGroup.Name {
			foundCreatedGroup = true
			break
		}
	}
	if !foundCreatedGroup {
		t.Fatalf("expected created group %q to appear in groups list", createdGroup.Name)
	}
}
