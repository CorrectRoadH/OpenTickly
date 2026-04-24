package bootstrap

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrVerificationSiteURLMissing is returned from SendVerificationEmail when the
// instance admin has not set a site URL. Without one we cannot produce a
// clickable verification link, so we refuse to send a broken email.
var ErrVerificationSiteURLMissing = errors.New("instance site URL is not configured")

// dbBackedEmailVerifier checks whether email verification is required (from instance_admin_config)
// and sends verification emails via the DB-backed SMTP sender.
type dbBackedEmailVerifier struct {
	pool        *pgxpool.Pool
	emailSender *dbBackedEmailSender
}

func newEmailVerifierFromDB(pool *pgxpool.Pool, emailSender *dbBackedEmailSender) *dbBackedEmailVerifier {
	return &dbBackedEmailVerifier{pool: pool, emailSender: emailSender}
}

// IsVerificationRequired is true only when the admin has asked for email
// verification AND the deployment can actually deliver a usable verification
// link (SMTP + site URL). Returning false when the URL is missing keeps
// registration functional but prevents shipping dead links; admins are
// notified via warn-level logs.
func (v *dbBackedEmailVerifier) IsVerificationRequired(ctx context.Context) bool {
	if !v.emailSender.IsConfigured() {
		return false
	}
	var required bool
	var siteURL string
	err := v.pool.QueryRow(ctx,
		`SELECT email_verification_required, COALESCE(site_url, '') FROM instance_admin_config WHERE id = 1`,
	).Scan(&required, &siteURL)
	if err == pgx.ErrNoRows {
		return false
	}
	if err != nil {
		return false
	}
	if required && strings.TrimSpace(siteURL) == "" {
		slog.Default().WarnContext(ctx,
			"email verification is required but site_url is not set; skipping verification to avoid dead links. Set site_url in instance admin settings.",
		)
		return false
	}
	return required
}

func (v *dbBackedEmailVerifier) SendVerificationEmail(ctx context.Context, email string, token string) error {
	var siteURL string
	_ = v.pool.QueryRow(ctx,
		`SELECT site_url FROM instance_admin_config WHERE id = 1`,
	).Scan(&siteURL)
	siteURL = strings.TrimSpace(siteURL)
	if siteURL == "" {
		return ErrVerificationSiteURLMissing
	}

	verifyURL := fmt.Sprintf("%s/verify-email?token=%s", siteURL, token)

	subject := "Verify your OpenTickly email"
	body := fmt.Sprintf(`<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
<h2 style="color: #1a1a1a;">Welcome to OpenTickly</h2>
<p>Please verify your email address by clicking the button below:</p>
<p style="text-align: center; margin: 32px 0;">
  <a href="%s" style="background: #e05d26; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
    Verify Email
  </a>
</p>
<p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
<p style="color: #666; font-size: 14px; word-break: break-all;">%s</p>
<p style="color: #999; font-size: 12px;">This link expires in 24 hours.</p>
</div>`, verifyURL, verifyURL)

	return v.emailSender.Send(ctx, email, subject, body)
}
