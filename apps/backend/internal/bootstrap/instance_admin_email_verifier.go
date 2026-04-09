package bootstrap

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// dbBackedEmailVerifier checks whether email verification is required (from instance_admin_config)
// and sends verification emails via the DB-backed SMTP sender.
type dbBackedEmailVerifier struct {
	pool        *pgxpool.Pool
	emailSender *dbBackedEmailSender
}

func newEmailVerifierFromDB(pool *pgxpool.Pool, emailSender *dbBackedEmailSender) *dbBackedEmailVerifier {
	return &dbBackedEmailVerifier{pool: pool, emailSender: emailSender}
}

func (v *dbBackedEmailVerifier) IsVerificationRequired(ctx context.Context) bool {
	if !v.emailSender.IsConfigured() {
		return false
	}
	var required bool
	err := v.pool.QueryRow(ctx,
		`SELECT email_verification_required FROM instance_admin_config WHERE id = 1`,
	).Scan(&required)
	if err == pgx.ErrNoRows {
		return false
	}
	if err != nil {
		return false
	}
	return required
}

func (v *dbBackedEmailVerifier) SendVerificationEmail(ctx context.Context, email string, token string) error {
	var siteURL string
	_ = v.pool.QueryRow(ctx,
		`SELECT site_url FROM instance_admin_config WHERE id = 1`,
	).Scan(&siteURL)
	if siteURL == "" {
		siteURL = "http://localhost:3000"
	}

	verifyURL := fmt.Sprintf("%s/verify-email?token=%s", siteURL, token)

	subject := "Verify your OpenToggl email"
	body := fmt.Sprintf(`<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
<h2 style="color: #1a1a1a;">Welcome to OpenToggl</h2>
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
