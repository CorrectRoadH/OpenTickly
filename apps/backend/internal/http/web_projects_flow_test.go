package httpapp

import (
	"net/http"
	"testing"

	"opentoggl/backend/apps/backend/internal/web"
)

func TestProjectRoutesExposeTemplateStatsAndPeriodsInSummaryResponses(t *testing.T) {
	server := NewServer(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		NewWebRouteRegistrar(NewWebHandlers()),
	)
	sessionCookie := mustRegisterWebSession(t, server)

	listProjects := performWebRequest(
		t,
		server,
		http.MethodGet,
		"/web/v1/projects?workspace_id=1",
		"",
		sessionCookie,
	)
	if listProjects.Code != http.StatusOK {
		t.Fatalf("expected list projects status 200, got %d body=%s", listProjects.Code, listProjects.Body.String())
	}

	listProjectsBody := decodeJSONBody(t, listProjects.Body.Bytes())
	projects, ok := listProjectsBody["projects"].([]any)
	if !ok || len(projects) == 0 {
		t.Fatalf("expected list projects response to include projects, got %#v", listProjectsBody["projects"])
	}

	project, ok := projects[0].(map[string]any)
	if !ok {
		t.Fatalf("expected first project to be an object, got %#v", projects[0])
	}
	assertProjectSummaryCatalogFields(t, project)

	pinProject := performWebRequest(
		t,
		server,
		http.MethodPost,
		"/web/v1/projects/1001/pin",
		"",
		sessionCookie,
	)
	if pinProject.Code != http.StatusOK {
		t.Fatalf("expected pin project status 200, got %d body=%s", pinProject.Code, pinProject.Body.String())
	}

	pinProjectBody := decodeJSONBody(t, pinProject.Body.Bytes())
	assertProjectSummaryCatalogFields(t, pinProjectBody)
	if pinProjectBody["pinned"] != true {
		t.Fatalf("expected pinned project response to set pinned=true, got %#v", pinProjectBody["pinned"])
	}

	archiveProject := performWebRequest(
		t,
		server,
		http.MethodPost,
		"/web/v1/projects/1001/archive",
		"",
		sessionCookie,
	)
	if archiveProject.Code != http.StatusOK {
		t.Fatalf("expected archive project status 200, got %d body=%s", archiveProject.Code, archiveProject.Body.String())
	}

	archiveProjectBody := decodeJSONBody(t, archiveProject.Body.Bytes())
	assertProjectSummaryCatalogFields(t, archiveProjectBody)
	if archiveProjectBody["active"] != false {
		t.Fatalf("expected archived project response to set active=false, got %#v", archiveProjectBody["active"])
	}

	createProject := performWebRequest(
		t,
		server,
		http.MethodPost,
		"/web/v1/projects",
		`{"workspace_id":1,"name":"Launch Website"}`,
		sessionCookie,
	)
	if createProject.Code != http.StatusCreated {
		t.Fatalf("expected create project status 201, got %d body=%s", createProject.Code, createProject.Body.String())
	}

	createProjectBody := decodeJSONBody(t, createProject.Body.Bytes())
	assertProjectSummaryCatalogFields(t, createProjectBody)
	if createProjectBody["template"] != false {
		t.Fatalf("expected created project template=false, got %#v", createProjectBody["template"])
	}
	if createProjectBody["actual_seconds"] != float64(0) {
		t.Fatalf("expected created project actual_seconds=0, got %#v", createProjectBody["actual_seconds"])
	}
	if createProjectBody["recurring_period"] != nil {
		t.Fatalf("expected created project recurring_period=null, got %#v", createProjectBody["recurring_period"])
	}
}

func assertProjectSummaryCatalogFields(t *testing.T, body map[string]any) {
	t.Helper()

	if body["client_name"] != "North Ridge Client" && body["client_name"] != nil {
		t.Fatalf("expected client_name to stay explicit, got %#v", body["client_name"])
	}
	if _, ok := body["template"].(bool); !ok {
		t.Fatalf("expected template to be a boolean, got %#v", body["template"])
	}
	if _, ok := body["actual_seconds"].(float64); !ok {
		t.Fatalf("expected actual_seconds to be numeric, got %#v", body["actual_seconds"])
	}
	if _, ok := body["tracked_seconds_current_period"].(float64); !ok {
		t.Fatalf(
			"expected tracked_seconds_current_period to be numeric, got %#v",
			body["tracked_seconds_current_period"],
		)
	}
	if _, ok := body["tracked_seconds_previous_period"].(float64); !ok {
		t.Fatalf(
			"expected tracked_seconds_previous_period to be numeric, got %#v",
			body["tracked_seconds_previous_period"],
		)
	}
	if recurringPeriod, ok := body["recurring_period"]; ok {
		if recurringPeriod != nil {
			if _, isString := recurringPeriod.(string); !isString {
				t.Fatalf("expected recurring_period to be string or null, got %#v", recurringPeriod)
			}
		}
	} else {
		t.Fatal("expected recurring_period to be present")
	}
	if _, ok := body["recurring_period_start"]; !ok {
		t.Fatal("expected recurring_period_start to be present")
	}
	if _, ok := body["recurring_period_end"]; !ok {
		t.Fatal("expected recurring_period_end to be present")
	}
}
