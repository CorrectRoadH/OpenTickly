package bootstrap

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"opentoggl/backend/apps/backend/internal/platform"
)

func TestSAMLFlowRejectsMalformedInputsWithoutConsumingState(t *testing.T) {
	redisURL := os.Getenv("SAML_TEST_REDIS_URL")
	if redisURL == "" {
		t.Skip("isolated Redis required")
	}
	cache, err := platform.NewRedisClient(redisURL)
	if err != nil {
		t.Fatal(err)
	}
	defer cache.Close()
	handlers := &routeHandlers{platformHandles: &platform.Handles{Cache: cache}}
	secret := strings.Repeat("a", 64)
	relay := "flow-input-" + time.Now().Format("150405.000000000")
	pending := samlPendingLogin{WorkspaceID: 1, Revision: 1, BrowserHash: samlBrowserHash(secret), Purpose: "login"}
	if err := cache.Set(context.Background(), samlStateKey(relay), pending, time.Minute); err != nil {
		t.Fatal(err)
	}
	defer cache.Del(context.Background(), samlStateKey(relay))
	base := url.Values{"RelayState": {relay}, "SAMLResponse": {"signed-value"}}
	for _, test := range []struct{ name, query, extra, cookie string }{
		{name: "artifact query", query: "?SAMLart=x", cookie: secret},
		{name: "artifact form", extra: "&SAMLart=x", cookie: secret},
		{name: "duplicate relay", extra: "&RelayState=other", cookie: secret},
		{name: "duplicate response", extra: "&SAMLResponse=other", cookie: secret},
		{name: "missing cookie"},
		{name: "other browser", cookie: strings.Repeat("b", 64)},
	} {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/auth/saml2/acs/1"+test.query, strings.NewReader(base.Encode()+test.extra))
			request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			if test.cookie != "" {
				request.AddCookie(&http.Cookie{Name: samlBrowserCookie, Value: test.cookie})
			}
			recorder := httptest.NewRecorder()
			if _, _, err := handlers.consumeSAMLFlow(echo.New().NewContext(request, recorder), 1); err == nil {
				t.Fatal("accepted malformed input")
			}
			if len(recorder.Result().Cookies()) != 0 {
				t.Fatal("failed callback cleared newer browser cookie")
			}
			var remaining samlPendingLogin
			if found, err := cache.Get(context.Background(), samlStateKey(relay), &remaining); err != nil || !found {
				t.Fatal("invalid input consumed valid state")
			}
		})
	}
	_ = cache.Close()
	request := httptest.NewRequest(http.MethodPost, "/auth/saml2/acs/1", strings.NewReader(base.Encode()))
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	request.AddCookie(&http.Cookie{Name: samlBrowserCookie, Value: secret})
	if _, _, err := handlers.consumeSAMLFlow(echo.New().NewContext(request, httptest.NewRecorder()), 1); err == nil {
		t.Fatal("Redis failure accepted")
	}
}
