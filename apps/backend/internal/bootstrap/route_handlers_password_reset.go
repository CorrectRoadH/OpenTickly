package bootstrap

import (
	"errors"
	"net/http"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	"opentoggl/backend/apps/backend/internal/http/httperror"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"

	"github.com/labstack/echo/v5"
)

// authPreconditionBody is the canonical shape for 422 responses from the
// forgot-password / reset-password / resend-verification endpoints when the
// instance's email sender is not usable. Mirrors invitePreconditionBody.
type authPreconditionBody struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

func (handlers *routeHandlers) requestPasswordReset(ctx *echo.Context) error {
	if err := handlers.authEmailLimiter.allow(ctx); err != nil {
		return err
	}
	var request webapi.ForgotPasswordRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	err := handlers.identityApp.RequestPasswordReset(ctx.Request().Context(), string(request.Email))
	if err != nil {
		return writeAuthPreconditionError(err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (handlers *routeHandlers) resetPassword(ctx *echo.Context) error {
	var request webapi.ResetPasswordRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	err := handlers.identityApp.ResetPassword(ctx.Request().Context(), request.Token, request.Password)
	if err != nil {
		switch {
		case errors.Is(err, identityapplication.ErrPasswordResetTokenInvalid),
			errors.Is(err, identityapplication.ErrPasswordResetTokenExpired),
			errors.Is(err, identityapplication.ErrPasswordResetTokenConsumed):
			return httperror.New(http.StatusBadRequest, err.Error()).WithCause(err)
		default:
			return httperror.New(http.StatusInternalServerError, "Internal Server Error").WithCause(err)
		}
	}
	return ctx.NoContent(http.StatusOK)
}

func (handlers *routeHandlers) resendVerificationEmail(ctx *echo.Context) error {
	if err := handlers.authEmailLimiter.allow(ctx); err != nil {
		return err
	}
	var request webapi.ResendVerificationEmailRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	err := handlers.identityApp.ResendVerificationEmail(ctx.Request().Context(), string(request.Email))
	if err != nil {
		return writeAuthPreconditionError(err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

// writeAuthPreconditionError translates the handful of typed email-sender
// configuration errors into 422 responses with a structured body. Any other
// error becomes a 500 — RequestPasswordReset / ResendVerificationEmail never
// surface user-existence errors (they silently return nil).
func writeAuthPreconditionError(err error) error {
	switch {
	case errors.Is(err, ErrVerificationSiteURLMissing),
		errors.Is(err, ErrPasswordResetSiteURLMissing):
		return httperror.New(http.StatusUnprocessableEntity, authPreconditionBody{
			Error:   "site_url_not_configured",
			Message: "Set the site URL under instance admin settings before using this feature — the email needs a link recipients can open.",
		}).WithCause(err)
	case errors.Is(err, ErrPasswordResetSMTPNotConfigured):
		return httperror.New(http.StatusUnprocessableEntity, authPreconditionBody{
			Error:   "smtp_not_configured",
			Message: "Configure SMTP under instance admin settings before using this feature.",
		}).WithCause(err)
	default:
		return httperror.New(http.StatusInternalServerError, "Internal Server Error").WithCause(err)
	}
}
