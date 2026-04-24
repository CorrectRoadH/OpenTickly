package bootstrap

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrPasswordResetSiteURLMissing surfaces when the instance admin has not set
// a site URL. Reset links depend on it and we refuse to ship a broken email.
var ErrPasswordResetSiteURLMissing = errors.New("instance site URL is not configured")

// ErrPasswordResetSMTPNotConfigured surfaces when the instance has no usable
// SMTP configuration. The admin UI must be fixed before reset requests can
// complete.
var ErrPasswordResetSMTPNotConfigured = errors.New("smtp is not configured")

// dbBackedPasswordResetEmailer sends password reset links using the
// DB-backed SMTP configuration. It refuses to send when the site URL or
// SMTP are not configured so the admin must fix their setup first.
type dbBackedPasswordResetEmailer struct {
	pool        *pgxpool.Pool
	emailSender *dbBackedEmailSender
}

func newPasswordResetEmailerFromDB(pool *pgxpool.Pool, emailSender *dbBackedEmailSender) *dbBackedPasswordResetEmailer {
	return &dbBackedPasswordResetEmailer{pool: pool, emailSender: emailSender}
}

func (e *dbBackedPasswordResetEmailer) SendPasswordResetEmail(ctx context.Context, email string, token string) error {
	if !e.emailSender.IsConfigured() {
		return ErrPasswordResetSMTPNotConfigured
	}

	var siteURL string
	_ = e.pool.QueryRow(ctx,
		`SELECT site_url FROM instance_admin_config WHERE id = 1`,
	).Scan(&siteURL)
	siteURL = strings.TrimSpace(siteURL)
	if siteURL == "" {
		return ErrPasswordResetSiteURLMissing
	}

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", siteURL, token)

	subject := "Reset your OpenTickly password"
	body := fmt.Sprintf(`<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
<h2 style="color: #1a1a1a;">Reset your OpenTickly password</h2>
<p>We received a request to reset the password for this account. Click the button below to choose a new password:</p>
<p style="text-align: center; margin: 32px 0;">
  <a href="%s" style="background: #e05d26; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
    Reset Password
  </a>
</p>
<p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
<p style="color: #666; font-size: 14px; word-break: break-all;">%s</p>
<p style="color: #999; font-size: 12px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
</div>`, resetURL, resetURL)

	return e.emailSender.Send(ctx, email, subject, body)
}
