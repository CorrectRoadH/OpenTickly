package httpapp

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"opentoggl/backend/apps/backend/internal/web"

	"github.com/labstack/echo/v5"
)

func TestServerPreservesFrameworkErrorsAndCommittedResponses(t *testing.T) {
	server := NewServer(web.NewHealthSnapshot("opentoggl", nil), func(server *echo.Echo) {
		server.GET("/invalid", func(c *echo.Context) error {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid parameter")
		})
		server.GET("/committed", func(c *echo.Context) error {
			if err := c.String(http.StatusCreated, "created"); err != nil {
				return err
			}
			return echo.ErrBadRequest
		})
	})

	invalid := httptest.NewRecorder()
	server.ServeHTTP(invalid, httptest.NewRequest(http.MethodGet, "/invalid", nil))
	var payload struct {
		Message string `json:"message"`
	}
	if invalid.Code != http.StatusBadRequest ||
		json.Unmarshal(invalid.Body.Bytes(), &payload) != nil ||
		payload.Message != "invalid parameter" {
		t.Fatalf("unexpected framework error response: %d %s", invalid.Code, invalid.Body)
	}

	committed := httptest.NewRecorder()
	server.ServeHTTP(committed, httptest.NewRequest(http.MethodGet, "/committed", nil))
	if committed.Code != http.StatusCreated || committed.Body.String() != "created" {
		t.Fatalf("committed response was changed: %d %s", committed.Code, committed.Body)
	}
}
