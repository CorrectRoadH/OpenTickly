package monitoring

import (
	"net/http"
	"regexp"
)

type requestRoute struct {
	path                *regexp.Regexp
	read, write, remove string
}

var requestRoutes = []requestRoute{
	{regexp.MustCompile(`^/(?:api/v9|web/v1)/workspaces/[^/]+/projects(?:/[^/]+)?$`), "project.list", "project.save", "project.save"},
	{regexp.MustCompile(`^/(?:api/v9|web/v1)/workspaces/[^/]+/clients(?:/[^/]+)?$`), "client.list", "client.save", "client.save"},
	{regexp.MustCompile(`^/api/v9/(?:me/)?time_entries(?:/[^/]+)?$`), "time_entry.list", "time_entry.create", "time_entry.delete"},
	{regexp.MustCompile(`^/api/v9/workspaces/[^/]+/time_entries(?:/[^/]+)?$`), "time_entry.list", "time_entry.create", "time_entry.delete"},
	{regexp.MustCompile(`^/reports/api/v3/workspace/[^/]+/(?:search/time_entries|summary/time_entries|weekly/time_entries)$`), "report.load", "report.load", ""},
}

// RouteOperation receives the router's static template, never a request URL.
func RouteOperation(method, route string) string {
	if method == http.MethodGet && (route == "/healthz" || route == "/readyz") {
		return "health.check"
	}
	switch method + " " + route {
	case "POST /web/v1/auth/login", "POST /api/v9/me":
		return "auth.login"
	case "POST /web/v1/auth/logout":
		return "auth.logout"
	case "POST /auth/sso/resolve":
		return "auth.sso.resolve"
	case "GET /api/v9/me/time_entries/current":
		return "time_entry.list"
	case "PATCH /api/v9/workspaces/:workspace_id/time_entries/:time_entry_id/stop":
		return "timer.stop"
	}
	for _, entry := range requestRoutes {
		if !entry.path.MatchString(route) {
			continue
		}
		name := ""
		switch method {
		case http.MethodGet:
			name = entry.read
		case http.MethodPost:
			name = entry.write
		case http.MethodPut, http.MethodPatch:
			name = entry.write
			if name == "time_entry.create" {
				name = "time_entry.update"
			}
		case http.MethodDelete:
			name = entry.remove
		}
		if name != "" {
			return name
		}
	}
	return "http.server"
}
