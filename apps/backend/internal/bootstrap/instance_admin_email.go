package bootstrap

import (
	"context"

	"opentoggl/backend/apps/backend/internal/platform"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// dbBackedEmailSender loads SMTP config from the DB on every call,
// so config changes take effect without restart.
type dbBackedEmailSender struct {
	pool *pgxpool.Pool
}

func newEmailSenderFromDB(pool *pgxpool.Pool) *dbBackedEmailSender {
	return &dbBackedEmailSender{pool: pool}
}

func (s *dbBackedEmailSender) loadConfig() platform.EmailConfig {
	var cfg platform.EmailConfig
	err := s.pool.QueryRow(context.Background(),
		`SELECT sender_name, sender_email, smtp_host, smtp_port, smtp_username, smtp_password
		 FROM instance_admin_config WHERE id = 1`,
	).Scan(&cfg.SenderName, &cfg.SenderAddr, &cfg.Host, &cfg.Port, &cfg.Username, &cfg.Password)
	if err == pgx.ErrNoRows {
		return platform.EmailConfig{}
	}
	if err != nil {
		return platform.EmailConfig{}
	}
	return cfg
}

func (s *dbBackedEmailSender) IsSMTPConfigured() bool {
	return s.IsConfigured()
}

func (s *dbBackedEmailSender) IsConfigured() bool {
	cfg := s.loadConfig()
	// No config row or SMTP not touched → treat as unconfigured but don't block.
	// Only truly "configured" when host and username are both set.
	return cfg.Host != "" && cfg.Username != ""
}

func (s *dbBackedEmailSender) Send(ctx context.Context, to string, subject string, bodyHTML string) error {
	sender := platform.NewEmailSender(s.loadConfig())
	return sender.Send(ctx, to, subject, bodyHTML)
}

func (s *dbBackedEmailSender) SendTest(ctx context.Context, to string, siteURL string) error {
	sender := platform.NewEmailSender(s.loadConfig())
	return sender.SendTest(ctx, to, siteURL)
}
