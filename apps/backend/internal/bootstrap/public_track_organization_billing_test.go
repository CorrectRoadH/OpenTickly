package bootstrap

import (
	"net/http"
	"testing"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestPublicTrackOrganizationBillingReads(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("billing-owner")

	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server:      ServerConfig{ListenAddress: ":0"},
		Database:    DatabaseConfig{PrimaryDSN: database.ConnString()},
		Redis:       RedisConfig{Address: "redis://127.0.0.1:6379/0"},
	})
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}
	t.Cleanup(app.Platform.Database.Close)

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Billing Owner",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	var registerBody struct {
		CurrentOrganizationID *int64 `json:"current_organization_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	organizationID := *registerBody.CurrentOrganizationID

	resetToken := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/me/reset_token",
		nil,
		basicAuthorization(uniqueEmail, "secret1"),
	)
	if resetToken.Code != http.StatusOK {
		t.Fatalf("expected reset token status 200, got %d body=%s", resetToken.Code, resetToken.Body.String())
	}
	var rotatedToken string
	mustDecodeJSON(t, resetToken.Body.Bytes(), &rotatedToken)
	tokenAuthorization := basicAuthorization(rotatedToken, "api_token")

	plans := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/organizations/"+intToString(organizationID)+"/plans",
		nil,
		tokenAuthorization,
	)
	if plans.Code != http.StatusOK {
		t.Fatalf("expected organization plans status 200, got %d body=%s", plans.Code, plans.Body.String())
	}
	var plansBody map[string]any
	mustDecodeJSON(t, plans.Body.Bytes(), &plansBody)
	planItems, ok := plansBody["plans"].([]any)
	if !ok || len(planItems) == 0 {
		t.Fatalf("expected non-empty plans body, got %#v", plansBody)
	}

	plan := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/organizations/"+intToString(organizationID)+"/plans/1",
		nil,
		tokenAuthorization,
	)
	if plan.Code != http.StatusOK {
		t.Fatalf("expected organization plan status 200, got %d body=%s", plan.Code, plan.Body.String())
	}

	usage := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/organizations/"+intToString(organizationID)+"/usage",
		nil,
		tokenAuthorization,
	)
	if usage.Code != http.StatusOK {
		t.Fatalf("expected organization usage status 200, got %d body=%s", usage.Code, usage.Body.String())
	}
	var usageBody []map[string]any
	mustDecodeJSON(t, usage.Body.Bytes(), &usageBody)
	if len(usageBody) == 0 {
		t.Fatalf("expected non-empty organization usage, got %#v", usageBody)
	}
}
