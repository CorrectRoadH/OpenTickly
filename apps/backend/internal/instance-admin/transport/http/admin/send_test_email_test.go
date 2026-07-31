package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	adminapi "opentoggl/backend/apps/backend/internal/http/generated/admin"
	"opentoggl/backend/apps/backend/internal/instance-admin/application"
	"opentoggl/backend/apps/backend/internal/instance-admin/domain"

	"github.com/labstack/echo/v4"
)

// A failed delivery must still answer 200 with the reason in the body.
// Returning 5xx lets reverse proxies (Cloudflare) swap the JSON for an HTML
// error page, so the admin sees a "502 Bad gateway" dump instead of the cause.
func TestSendTestEmailReportsFailureAsOkWithCode(t *testing.T) {
	sender := &stubEmailSender{sendErr: errors.New("smtp tls host:465: handshake failure"), code: "tls_failed"}
	result, status := callSendTestEmail(t, sender, `{"to":"admin@example.test"}`)

	if status != http.StatusOK {
		t.Fatalf("status = %d, want 200", status)
	}
	if result.Success {
		t.Fatal("Success = true, want false for a failed delivery")
	}
	if result.Code != adminapi.TlsFailed {
		t.Fatalf("Code = %q, want %q", result.Code, adminapi.TlsFailed)
	}
	if result.Message == "" {
		t.Fatal("Message must carry the SMTP detail for diagnostics")
	}
}

func TestSendTestEmailReportsSuccess(t *testing.T) {
	result, status := callSendTestEmail(t, &stubEmailSender{code: "sent"}, `{"to":"admin@example.test"}`)

	if status != http.StatusOK {
		t.Fatalf("status = %d, want 200", status)
	}
	if !result.Success {
		t.Fatalf("Success = false, message = %q", result.Message)
	}
	if result.Code != adminapi.Sent {
		t.Fatalf("Code = %q, want %q", result.Code, adminapi.Sent)
	}
}

func callSendTestEmail(t *testing.T, sender application.EmailSender, body string) (adminapi.TestEmailResult, int) {
	t.Helper()

	service, err := application.NewService(application.Config{
		Bootstrap:          stubStore{},
		RegistrationPolicy: stubStore{},
		InstanceUsers:      stubStore{},
		InstanceConfig:     stubStore{},
		OrgLister:          stubStore{},
		UserCreator:        stubStore{},
		EmailSender:        sender,
		Clock:              stubStore{},
	})
	if err != nil {
		t.Fatalf("NewService: %v", err)
	}

	e := echo.New()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/admin/v1/config/test-email", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	ctx := e.NewContext(req, rec)

	if err := NewHandler(service, nil, nil).SendTestEmail(ctx); err != nil {
		t.Fatalf("SendTestEmail: %v", err)
	}
	var result adminapi.TestEmailResult
	if rec.Body.Len() > 0 {
		if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil {
			t.Fatalf("unmarshal %q: %v", rec.Body.String(), err)
		}
	}
	return result, rec.Code
}

type stubEmailSender struct {
	sendErr error
	code    string
}

func (s *stubEmailSender) IsConfigured() bool { return true }

func (s *stubEmailSender) Send(_ context.Context, _ string, _ string, _ string) error {
	return s.sendErr
}

func (s *stubEmailSender) SendTest(_ context.Context, _ string, _ string) error { return s.sendErr }

func (s *stubEmailSender) ClassifyFailure(_ error) string { return s.code }

// stubStore satisfies every non-email port the service requires; the
// send-test-email path only reads instance config.
type stubStore struct{}

func (stubStore) GetBootstrapState(_ context.Context) (domain.BootstrapState, error) {
	return domain.BootstrapState{}, nil
}

func (stubStore) CompleteBootstrap(_ context.Context, _ string, _ time.Time) error { return nil }

func (stubStore) GetRegistrationPolicy(_ context.Context) (domain.RegistrationPolicy, error) {
	return domain.RegistrationPolicy{}, nil
}

func (stubStore) SetRegistrationPolicy(_ context.Context, _ domain.RegistrationMode, _ time.Time) error {
	return nil
}

func (stubStore) ListUsers(_ context.Context, _ application.InstanceUserFilter) (application.InstanceUserPage, error) {
	return application.InstanceUserPage{}, nil
}

func (stubStore) DisableUser(_ context.Context, _ int64) error { return nil }
func (stubStore) RestoreUser(_ context.Context, _ int64) error { return nil }
func (stubStore) CountUsers(_ context.Context) (int, error)    { return 0, nil }

func (stubStore) GetConfig(_ context.Context) (application.InstanceConfigView, error) {
	return application.InstanceConfigView{SiteURL: "https://track.example.test"}, nil
}

func (stubStore) UpdateConfig(_ context.Context, _ application.InstanceConfigUpdate) (application.InstanceConfigView, error) {
	return application.InstanceConfigView{}, nil
}

func (stubStore) ListOrganizations(_ context.Context) ([]application.AdminOrganizationView, error) {
	return nil, nil
}

func (stubStore) CreateUser(_ context.Context, _ string, _ string, _ string) (int64, error) {
	return 0, nil
}

func (stubStore) MarkInstanceAdmin(_ context.Context, _ int64) error { return nil }

func (stubStore) Now() time.Time { return time.Unix(0, 0).UTC() }
