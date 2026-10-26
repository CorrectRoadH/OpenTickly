package bootstrap

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
)

func TestSAMLBrowserCookieRoundTrip(t *testing.T) {
	if os.Getenv("SAML_TEST_BROWSER") != "1" {
		t.Skip("set SAML_TEST_BROWSER=1 for real Chromium acceptance")
	}
	f := newSAMLSecurityFixture(t)
	f.app.HTTP.GET("/saml-test-ready", func(c echo.Context) error { return c.HTML(200, `<div data-testid="saml-test-ready">Ready</div>`) })
	server := httptest.NewTLSServer(f.app.HTTP)
	defer server.Close()
	idp := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assertion := f.assertion(t, r)
		if err := assertion.WriteResponse(w); err != nil {
			t.Error(err)
			http.Error(w, "IdP failed", 500)
		}
	}))
	defer idp.Close()
	// localhost and 127.0.0.1 are different sites: this exercises SameSite=None.
	idpURL := strings.Replace(idp.URL, "127.0.0.1", "localhost", 1)
	if _, err := f.db.Pool.Exec(context.Background(), `UPDATE instance_admin_config SET site_url=$1`, server.URL); err != nil {
		t.Fatal(err)
	}
	if _, err := f.db.Pool.Exec(context.Background(), `UPDATE tenant_workspace_sso_config SET idp_sso_url=$1,revision=revision+1 WHERE workspace_id=$2`, idpURL, f.workspace); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Cookie", f.cookie)
	session, err := req.Cookie("opentoggl_session")
	if err != nil {
		t.Fatal(err)
	}
	input := struct {
		Base      string `json:"base"`
		Workspace int64  `json:"workspace"`
		Session   string `json:"session"`
	}{server.URL, f.workspace, session.Value}
	data, err := json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	root, err := filepath.Abs("../../../..")
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	command := exec.CommandContext(ctx, "vp", "exec", "node", "apps/backend/internal/bootstrap/testdata/saml-browser.mjs")
	command.Dir = root
	command.Stdin = bytes.NewReader(data)
	output, err := command.CombinedOutput()
	if err != nil {
		t.Fatalf("browser: %v\n%s", err, output)
	}
	t.Log(string(output))
}
