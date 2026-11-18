package bootstrap

import (
	"errors"
	"net/http"
	"testing"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	"opentoggl/backend/apps/backend/internal/http/httperror"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
)

func TestWriteMembershipErrorReturnsDeliveryFailureAsStructured422(t *testing.T) {
	cause := errors.New("smtp resolver timed out")
	err := writeMembershipError(&membershipapplication.EmailDeliveryError{
		Code: "timeout",
		Err:  cause,
	})

	httpErr, ok := err.(*httperror.Error)
	if !ok {
		t.Fatalf("expected *httperror.Error, got %T", err)
	}
	if httpErr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d", httpErr.Code)
	}
	body, ok := httpErr.Message.(webapi.WorkspaceInvitationError)
	if !ok {
		t.Fatalf("expected generated WorkspaceInvitationError, got %T", httpErr.Message)
	}
	if body.Error != webapi.Timeout || body.Message != "Invitation email delivery failed." {
		t.Fatalf("unexpected delivery error body: %#v", body)
	}
}

func TestWriteMembershipErrorNormalizesUnknownDeliveryCode(t *testing.T) {
	err := writeMembershipError(&membershipapplication.EmailDeliveryError{
		Code: "provider_specific_code",
		Err:  errors.New("provider failed"),
	})
	httpErr := err.(*httperror.Error)
	body := httpErr.Message.(webapi.WorkspaceInvitationError)
	if body.Error != webapi.Unknown {
		t.Fatalf("expected unknown code, got %q", body.Error)
	}
}
