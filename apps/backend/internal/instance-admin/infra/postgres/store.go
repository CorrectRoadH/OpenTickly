package postgres

import (
	"context"
	"fmt"
	"time"

	"opentoggl/backend/apps/backend/internal/instance-admin/application"
	"opentoggl/backend/apps/backend/internal/instance-admin/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Store implements all instance-admin postgres ports.
type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

// --- BootstrapStore ---

func (s *Store) GetBootstrapState(ctx context.Context) (domain.BootstrapState, error) {
	var state domain.BootstrapState
	err := s.pool.QueryRow(ctx,
		`SELECT completed, admin_email, completed_at FROM instance_admin_bootstrap LIMIT 1`,
	).Scan(&state.Completed, &state.AdminEmail, &state.CompletedAt)
	if err == pgx.ErrNoRows {
		return domain.NewBootstrapState(), nil
	}
	if err != nil {
		return domain.BootstrapState{}, fmt.Errorf("instance-admin get bootstrap: %w", err)
	}
	return state, nil
}

func (s *Store) CompleteBootstrap(ctx context.Context, adminEmail string, completedAt time.Time) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO instance_admin_bootstrap (completed, admin_email, completed_at)
		 VALUES (true, $1, $2)
		 ON CONFLICT (id) DO NOTHING`,
		adminEmail, completedAt,
	)
	if err != nil {
		return fmt.Errorf("instance-admin complete bootstrap: %w", err)
	}
	return nil
}

// --- RegistrationPolicyStore ---

func (s *Store) GetRegistrationPolicy(ctx context.Context) (domain.RegistrationPolicy, error) {
	var policy domain.RegistrationPolicy
	var modeStr string
	err := s.pool.QueryRow(ctx,
		`SELECT mode, updated_at FROM instance_admin_registration_policy LIMIT 1`,
	).Scan(&modeStr, &policy.UpdatedAt)
	if err == pgx.ErrNoRows {
		return domain.NewDefaultPolicy(time.Now()), nil
	}
	if err != nil {
		return domain.RegistrationPolicy{}, fmt.Errorf("instance-admin get registration policy: %w", err)
	}
	policy.Mode = domain.RegistrationMode(modeStr)
	return policy, nil
}

func (s *Store) SetRegistrationPolicy(ctx context.Context, mode domain.RegistrationMode, updatedAt time.Time) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO instance_admin_registration_policy (id, mode, updated_at)
		 VALUES (1, $1, $2)
		 ON CONFLICT (id) DO UPDATE SET mode = $1, updated_at = $2`,
		string(mode), updatedAt,
	)
	if err != nil {
		return fmt.Errorf("instance-admin set registration policy: %w", err)
	}
	return nil
}

// --- InstanceUserStore ---

func (s *Store) ListUsers(ctx context.Context, filter application.InstanceUserFilter) (application.InstanceUserPage, error) {
	baseQuery := `FROM identity_users WHERE 1=1`
	args := []any{}
	argN := 0

	if filter.Status == "active" {
		argN++
		baseQuery += fmt.Sprintf(` AND state = $%d`, argN)
		args = append(args, "active")
	} else if filter.Status == "disabled" {
		argN++
		baseQuery += fmt.Sprintf(` AND state = $%d`, argN)
		args = append(args, "deactivated")
	}

	if filter.Query != "" {
		argN++
		baseQuery += fmt.Sprintf(` AND (email ILIKE $%d OR full_name ILIKE $%d)`, argN, argN)
		args = append(args, "%"+filter.Query+"%")
	}

	var totalCount int
	countArgs := make([]any, len(args))
	copy(countArgs, args)
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) `+baseQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		return application.InstanceUserPage{}, fmt.Errorf("instance-admin count users: %w", err)
	}

	offset := (filter.Page - 1) * filter.PerPage
	argN++
	limitArg := argN
	argN++
	offsetArg := argN
	query := fmt.Sprintf(
		`SELECT id, email, full_name, state, created_at %s ORDER BY id ASC LIMIT $%d OFFSET $%d`,
		baseQuery, limitArg, offsetArg,
	)
	args = append(args, filter.PerPage, offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return application.InstanceUserPage{}, fmt.Errorf("instance-admin list users: %w", err)
	}
	defer rows.Close()

	var users []application.InstanceUserView
	for rows.Next() {
		var u application.InstanceUserView
		var stateStr string
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &stateStr, &u.CreatedAt); err != nil {
			return application.InstanceUserPage{}, fmt.Errorf("instance-admin scan user: %w", err)
		}
		if stateStr == "deactivated" {
			u.Status = "disabled"
		} else {
			u.Status = stateStr
		}
		users = append(users, u)
	}
	if users == nil {
		users = []application.InstanceUserView{}
	}

	return application.InstanceUserPage{
		Users:      users,
		TotalCount: totalCount,
		Page:       filter.Page,
		PerPage:    filter.PerPage,
	}, nil
}

func (s *Store) DisableUser(ctx context.Context, userID int64) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE identity_users SET state = 'deactivated', updated_at = now() WHERE id = $1 AND state = 'active'`,
		userID,
	)
	if err != nil {
		return fmt.Errorf("instance-admin disable user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrInstanceUserNotFound
	}
	return nil
}

func (s *Store) RestoreUser(ctx context.Context, userID int64) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE identity_users SET state = 'active', updated_at = now() WHERE id = $1 AND state = 'deactivated'`,
		userID,
	)
	if err != nil {
		return fmt.Errorf("instance-admin restore user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrInstanceUserNotFound
	}
	return nil
}

func (s *Store) CountUsers(ctx context.Context) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM identity_users`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("instance-admin count users: %w", err)
	}
	return count, nil
}

// --- InstanceConfigStore ---

func (s *Store) GetConfig(ctx context.Context) (application.InstanceConfigView, error) {
	var cfg application.InstanceConfigView
	var smtpUsername string
	err := s.pool.QueryRow(ctx,
		`SELECT site_url, sender_email, sender_name, smtp_host, smtp_port, smtp_username, email_verification_required, updated_at
		 FROM instance_admin_config WHERE id = 1`,
	).Scan(&cfg.SiteURL, &cfg.SenderEmail, &cfg.SenderName, &cfg.SMTPHost, &cfg.SMTPPort, &smtpUsername, &cfg.EmailVerificationRequired, &cfg.UpdatedAt)
	if err == pgx.ErrNoRows {
		return application.InstanceConfigView{SenderName: "OpenToggl"}, nil
	}
	if err != nil {
		return application.InstanceConfigView{}, fmt.Errorf("instance-admin get config: %w", err)
	}
	cfg.SMTPConfigured = cfg.SMTPHost != "" && smtpUsername != ""
	return cfg, nil
}

func (s *Store) UpdateConfig(ctx context.Context, update application.InstanceConfigUpdate) (application.InstanceConfigView, error) {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO instance_admin_config (id, site_url, sender_email, sender_name, smtp_host, smtp_port, smtp_username, smtp_password, updated_at)
		 VALUES (1, '', '', 'OpenToggl', '', 0, '', '', now())
		 ON CONFLICT (id) DO NOTHING`,
	)
	if err != nil {
		return application.InstanceConfigView{}, fmt.Errorf("instance-admin ensure config row: %w", err)
	}

	if update.SiteURL != nil {
		if _, err := s.pool.Exec(ctx, `UPDATE instance_admin_config SET site_url = $1, updated_at = now() WHERE id = 1`, *update.SiteURL); err != nil {
			return application.InstanceConfigView{}, fmt.Errorf("instance-admin update site_url: %w", err)
		}
	}
	if update.SenderEmail != nil {
		if _, err := s.pool.Exec(ctx, `UPDATE instance_admin_config SET sender_email = $1, updated_at = now() WHERE id = 1`, *update.SenderEmail); err != nil {
			return application.InstanceConfigView{}, fmt.Errorf("instance-admin update sender_email: %w", err)
		}
	}
	if update.SenderName != nil {
		if _, err := s.pool.Exec(ctx, `UPDATE instance_admin_config SET sender_name = $1, updated_at = now() WHERE id = 1`, *update.SenderName); err != nil {
			return application.InstanceConfigView{}, fmt.Errorf("instance-admin update sender_name: %w", err)
		}
	}
	if update.SMTPHost != nil {
		if _, err := s.pool.Exec(ctx, `UPDATE instance_admin_config SET smtp_host = $1, updated_at = now() WHERE id = 1`, *update.SMTPHost); err != nil {
			return application.InstanceConfigView{}, fmt.Errorf("instance-admin update smtp_host: %w", err)
		}
	}
	if update.SMTPPort != nil {
		if _, err := s.pool.Exec(ctx, `UPDATE instance_admin_config SET smtp_port = $1, updated_at = now() WHERE id = 1`, *update.SMTPPort); err != nil {
			return application.InstanceConfigView{}, fmt.Errorf("instance-admin update smtp_port: %w", err)
		}
	}
	if update.SMTPUsername != nil {
		if _, err := s.pool.Exec(ctx, `UPDATE instance_admin_config SET smtp_username = $1, updated_at = now() WHERE id = 1`, *update.SMTPUsername); err != nil {
			return application.InstanceConfigView{}, fmt.Errorf("instance-admin update smtp_username: %w", err)
		}
	}
	if update.SMTPPassword != nil {
		if _, err := s.pool.Exec(ctx, `UPDATE instance_admin_config SET smtp_password = $1, updated_at = now() WHERE id = 1`, *update.SMTPPassword); err != nil {
			return application.InstanceConfigView{}, fmt.Errorf("instance-admin update smtp_password: %w", err)
		}
	}
	if update.EmailVerificationRequired != nil {
		if _, err := s.pool.Exec(ctx, `UPDATE instance_admin_config SET email_verification_required = $1, updated_at = now() WHERE id = 1`, *update.EmailVerificationRequired); err != nil {
			return application.InstanceConfigView{}, fmt.Errorf("instance-admin update email_verification_required: %w", err)
		}
	}

	return s.GetConfig(ctx)
}

// --- OrganizationLister ---

func (s *Store) ListOrganizations(ctx context.Context) ([]application.AdminOrganizationView, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT
			o.id,
			o.name,
			(SELECT COUNT(*) FROM tenant_workspaces w WHERE w.organization_id = o.id) AS workspace_count,
			(SELECT COUNT(DISTINCT wu.user_id) FROM membership_workspace_members wu
			 JOIN tenant_workspaces w ON w.id = wu.workspace_id
			 WHERE w.organization_id = o.id AND wu.user_id IS NOT NULL) AS member_count
		FROM tenant_organizations o
		ORDER BY o.id
	`)
	if err != nil {
		return nil, fmt.Errorf("instance-admin list organizations: %w", err)
	}
	defer rows.Close()

	var orgs []application.AdminOrganizationView
	for rows.Next() {
		var org application.AdminOrganizationView
		if err := rows.Scan(&org.ID, &org.Name, &org.WorkspaceCount, &org.MemberCount); err != nil {
			return nil, fmt.Errorf("instance-admin scan organization: %w", err)
		}
		orgs = append(orgs, org)
	}
	if orgs == nil {
		orgs = []application.AdminOrganizationView{}
	}
	return orgs, nil
}
