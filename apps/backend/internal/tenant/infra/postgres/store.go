package postgres

import (
	"context"
	"errors"
	"fmt"

	"opentoggl/backend/apps/backend/internal/tenant/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

type rowScanner interface {
	Scan(dest ...any) error
}

type notFoundError string

func (err notFoundError) Error() string {
	return string(err)
}

func (err notFoundError) Is(target error) bool {
	return target != nil && target.Error() == string(err)
}

var (
	errOrganizationNotFound = notFoundError("organization not found")
	errWorkspaceNotFound    = notFoundError("workspace not found")
)

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (store *Store) CreateOrganization(
	ctx context.Context,
	name string,
	workspaceName string,
	settings domain.WorkspaceSettings,
) (domain.Organization, domain.Workspace, error) {
	normalizedOrganizationName, err := normalizeOrganizationName(name)
	if err != nil {
		return domain.Organization{}, domain.Workspace{}, err
	}
	normalizedWorkspaceName, err := normalizeWorkspaceName(workspaceName)
	if err != nil {
		return domain.Organization{}, domain.Workspace{}, err
	}

	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return domain.Organization{}, domain.Workspace{}, fmt.Errorf("begin tenant create organization tx: %w", err)
	}
	defer rollback(ctx, tx)

	var organizationID int64
	if err := tx.QueryRow(ctx, `
		insert into tenant_organizations (name)
		values ($1)
		returning id
	`, normalizedOrganizationName).Scan(&organizationID); err != nil {
		return domain.Organization{}, domain.Workspace{}, fmt.Errorf("insert tenant organization: %w", err)
	}

	organization, err := buildOrganization(organizationID, normalizedOrganizationName, nil)
	if err != nil {
		return domain.Organization{}, domain.Workspace{}, err
	}

	var workspaceID int64
	if err := tx.QueryRow(ctx, `
		insert into tenant_workspaces (
			organization_id,
			name,
			default_currency,
			default_hourly_rate,
			rounding,
			rounding_minutes,
			display_policy,
			only_admins_may_create_projects,
			only_admins_see_team_dashboard,
			projects_billable_by_default,
			reports_collapse,
			public_project_access
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		returning id
	`,
		organizationID,
		normalizedWorkspaceName,
		settings.DefaultCurrency(),
		settings.DefaultHourlyRate(),
		settings.Rounding(),
		settings.RoundingMinutes(),
		string(settings.DisplayPolicy()),
		settings.OnlyAdminsMayCreateProjects(),
		settings.OnlyAdminsSeeTeamDashboard(),
		settings.ProjectsBillableByDefault(),
		settings.ReportsCollapse(),
		string(settings.PublicProjectAccess()),
	).Scan(&workspaceID); err != nil {
		return domain.Organization{}, domain.Workspace{}, fmt.Errorf("insert tenant workspace: %w", err)
	}

	workspace, err := buildWorkspace(
		workspaceID,
		organizationID,
		normalizedWorkspaceName,
		settings,
		"",
		"",
	)
	if err != nil {
		return domain.Organization{}, domain.Workspace{}, err
	}

	organization.AddWorkspace(workspace.ID())
	if err := tx.Commit(ctx); err != nil {
		return domain.Organization{}, domain.Workspace{}, fmt.Errorf("commit tenant create organization tx: %w", err)
	}

	return organization, workspace, nil
}

func (store *Store) CreateWorkspace(
	ctx context.Context,
	organizationID domain.OrganizationID,
	name string,
	settings domain.WorkspaceSettings,
) (domain.Workspace, error) {
	normalizedWorkspaceName, err := normalizeWorkspaceName(name)
	if err != nil {
		return domain.Workspace{}, err
	}

	if _, found, err := store.GetOrganization(ctx, organizationID); err != nil {
		return domain.Workspace{}, err
	} else if !found {
		return domain.Workspace{}, errOrganizationNotFound
	}

	var workspaceID int64
	if err := store.pool.QueryRow(ctx, `
		insert into tenant_workspaces (
			organization_id,
			name,
			default_currency,
			default_hourly_rate,
			rounding,
			rounding_minutes,
			display_policy,
			only_admins_may_create_projects,
			only_admins_see_team_dashboard,
			projects_billable_by_default,
			reports_collapse,
			public_project_access
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		returning id
	`,
		int64(organizationID),
		normalizedWorkspaceName,
		settings.DefaultCurrency(),
		settings.DefaultHourlyRate(),
		settings.Rounding(),
		settings.RoundingMinutes(),
		string(settings.DisplayPolicy()),
		settings.OnlyAdminsMayCreateProjects(),
		settings.OnlyAdminsSeeTeamDashboard(),
		settings.ProjectsBillableByDefault(),
		settings.ReportsCollapse(),
		string(settings.PublicProjectAccess()),
	).Scan(&workspaceID); err != nil {
		if isForeignKeyViolation(err) {
			return domain.Workspace{}, errOrganizationNotFound
		}
		return domain.Workspace{}, fmt.Errorf("insert tenant workspace: %w", err)
	}

	return buildWorkspace(workspaceID, int64(organizationID), normalizedWorkspaceName, settings, "", "")
}

func (store *Store) GetOrganization(
	ctx context.Context,
	organizationID domain.OrganizationID,
) (domain.Organization, bool, error) {
	var name string
	if err := store.pool.QueryRow(ctx, `
		select name
		from tenant_organizations
		where id = $1
	`, int64(organizationID)).Scan(&name); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.Organization{}, false, nil
		}
		return domain.Organization{}, false, fmt.Errorf("query tenant organization %d: %w", organizationID, err)
	}

	rows, err := store.pool.Query(ctx, `
		select id
		from tenant_workspaces
		where organization_id = $1
		order by id
	`, int64(organizationID))
	if err != nil {
		return domain.Organization{}, false, fmt.Errorf("query workspace ids for organization %d: %w", organizationID, err)
	}
	defer rows.Close()

	workspaceIDs := []int64{}
	for rows.Next() {
		var workspaceID int64
		if err := rows.Scan(&workspaceID); err != nil {
			return domain.Organization{}, false, fmt.Errorf("scan workspace id for organization %d: %w", organizationID, err)
		}
		workspaceIDs = append(workspaceIDs, workspaceID)
	}
	if err := rows.Err(); err != nil {
		return domain.Organization{}, false, fmt.Errorf("iterate workspace ids for organization %d: %w", organizationID, err)
	}

	organization, err := buildOrganization(int64(organizationID), name, workspaceIDs)
	if err != nil {
		return domain.Organization{}, false, err
	}
	return organization, true, nil
}

func (store *Store) GetWorkspace(
	ctx context.Context,
	workspaceID domain.WorkspaceID,
) (domain.Workspace, bool, error) {
	row := store.pool.QueryRow(ctx, `
		select
			id,
			organization_id,
			name,
			logo_storage_key,
			avatar_storage_key,
			default_currency,
			default_hourly_rate,
			rounding,
			rounding_minutes,
			display_policy,
			only_admins_may_create_projects,
			only_admins_see_team_dashboard,
			projects_billable_by_default,
			reports_collapse,
			public_project_access
		from tenant_workspaces
		where id = $1
	`, int64(workspaceID))

	workspace, err := scanWorkspace(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.Workspace{}, false, nil
		}
		return domain.Workspace{}, false, err
	}
	return workspace, true, nil
}

func (store *Store) SaveOrganization(
	ctx context.Context,
	organization domain.Organization,
) error {
	commandTag, err := store.pool.Exec(ctx, `
		update tenant_organizations
		set name = $2
		where id = $1
	`, int64(organization.ID()), organization.Name())
	if err != nil {
		return fmt.Errorf("update tenant organization %d: %w", organization.ID(), err)
	}
	if commandTag.RowsAffected() == 0 {
		return errOrganizationNotFound
	}
	return nil
}

func (store *Store) SaveWorkspace(
	ctx context.Context,
	workspace domain.Workspace,
) error {
	commandTag, err := store.pool.Exec(ctx, `
		update tenant_workspaces
		set name = $2,
			logo_storage_key = $3,
			avatar_storage_key = $4,
			default_currency = $5,
			default_hourly_rate = $6,
			rounding = $7,
			rounding_minutes = $8,
			display_policy = $9,
			only_admins_may_create_projects = $10,
			only_admins_see_team_dashboard = $11,
			projects_billable_by_default = $12,
			reports_collapse = $13,
			public_project_access = $14
		where id = $1
	`,
		int64(workspace.ID()),
		workspace.Name(),
		brandingStorageKey(workspace.Branding(), domain.BrandingAssetKindLogo),
		brandingStorageKey(workspace.Branding(), domain.BrandingAssetKindAvatar),
		workspace.Settings().DefaultCurrency(),
		workspace.Settings().DefaultHourlyRate(),
		workspace.Settings().Rounding(),
		workspace.Settings().RoundingMinutes(),
		string(workspace.Settings().DisplayPolicy()),
		workspace.Settings().OnlyAdminsMayCreateProjects(),
		workspace.Settings().OnlyAdminsSeeTeamDashboard(),
		workspace.Settings().ProjectsBillableByDefault(),
		workspace.Settings().ReportsCollapse(),
		string(workspace.Settings().PublicProjectAccess()),
	)
	if err != nil {
		return fmt.Errorf("update tenant workspace %d: %w", workspace.ID(), err)
	}
	if commandTag.RowsAffected() == 0 {
		return errWorkspaceNotFound
	}
	return nil
}

func (store *Store) DeleteWorkspace(
	ctx context.Context,
	workspaceID domain.WorkspaceID,
) error {
	commandTag, err := store.pool.Exec(ctx, `
		delete from tenant_workspaces
		where id = $1
	`, int64(workspaceID))
	if err != nil {
		return fmt.Errorf("delete tenant workspace %d: %w", workspaceID, err)
	}
	if commandTag.RowsAffected() == 0 {
		return errWorkspaceNotFound
	}
	return nil
}

func (store *Store) DeleteOrganization(
	ctx context.Context,
	organizationID domain.OrganizationID,
) error {
	commandTag, err := store.pool.Exec(ctx, `
		delete from tenant_organizations
		where id = $1
	`, int64(organizationID))
	if err != nil {
		return fmt.Errorf("delete tenant organization %d: %w", organizationID, err)
	}
	if commandTag.RowsAffected() == 0 {
		return errOrganizationNotFound
	}
	return nil
}

func scanWorkspace(row rowScanner) (domain.Workspace, error) {
	var (
		workspaceID                 int64
		organizationID              int64
		name                        string
		logoStorageKey              string
		avatarStorageKey            string
		defaultCurrency             string
		defaultHourlyRate           float64
		rounding                    int
		roundingMinutes             int
		displayPolicy               string
		onlyAdminsMayCreateProjects bool
		onlyAdminsSeeTeamDashboard  bool
		projectsBillableByDefault   bool
		reportsCollapse             bool
		publicProjectAccess         string
	)

	if err := row.Scan(
		&workspaceID,
		&organizationID,
		&name,
		&logoStorageKey,
		&avatarStorageKey,
		&defaultCurrency,
		&defaultHourlyRate,
		&rounding,
		&roundingMinutes,
		&displayPolicy,
		&onlyAdminsMayCreateProjects,
		&onlyAdminsSeeTeamDashboard,
		&projectsBillableByDefault,
		&reportsCollapse,
		&publicProjectAccess,
	); err != nil {
		return domain.Workspace{}, err
	}

	settings, err := domain.NewWorkspaceSettings(domain.WorkspaceSettingsInput{
		DefaultCurrency:             defaultCurrency,
		DefaultHourlyRate:           defaultHourlyRate,
		Rounding:                    domain.WorkspaceRoundingMode(rounding),
		RoundingMinutes:             roundingMinutes,
		DisplayPolicy:               domain.WorkspaceDisplayPolicy(displayPolicy),
		OnlyAdminsMayCreateProjects: onlyAdminsMayCreateProjects,
		OnlyAdminsSeeTeamDashboard:  onlyAdminsSeeTeamDashboard,
		ProjectsBillableByDefault:   projectsBillableByDefault,
		ReportsCollapse:             reportsCollapse,
		PublicProjectAccess:         domain.WorkspacePublicProjectAccess(publicProjectAccess),
	})
	if err != nil {
		return domain.Workspace{}, fmt.Errorf("hydrate tenant workspace settings %d: %w", workspaceID, err)
	}

	return buildWorkspace(workspaceID, organizationID, name, settings, logoStorageKey, avatarStorageKey)
}

func buildOrganization(id int64, name string, workspaceIDs []int64) (domain.Organization, error) {
	organizationID, err := domain.NewOrganizationID(id)
	if err != nil {
		return domain.Organization{}, err
	}
	organization, err := domain.NewOrganization(organizationID, name)
	if err != nil {
		return domain.Organization{}, err
	}
	for _, workspaceID := range workspaceIDs {
		domainWorkspaceID, err := domain.NewWorkspaceID(workspaceID)
		if err != nil {
			return domain.Organization{}, err
		}
		organization.AddWorkspace(domainWorkspaceID)
	}
	return organization, nil
}

func buildWorkspace(
	workspaceID int64,
	organizationID int64,
	name string,
	settings domain.WorkspaceSettings,
	logoStorageKey string,
	avatarStorageKey string,
) (domain.Workspace, error) {
	domainWorkspaceID, err := domain.NewWorkspaceID(workspaceID)
	if err != nil {
		return domain.Workspace{}, err
	}
	domainOrganizationID, err := domain.NewOrganizationID(organizationID)
	if err != nil {
		return domain.Workspace{}, err
	}
	workspace, err := domain.NewWorkspace(domainWorkspaceID, domainOrganizationID, name, settings)
	if err != nil {
		return domain.Workspace{}, err
	}

	branding := workspace.Branding()
	if logoStorageKey != "" {
		logo, err := domain.NewBrandingAsset(domain.BrandingAssetKindLogo, logoStorageKey)
		if err != nil {
			return domain.Workspace{}, fmt.Errorf("hydrate workspace logo %d: %w", workspaceID, err)
		}
		branding = branding.WithAsset(logo)
	}
	if avatarStorageKey != "" {
		avatar, err := domain.NewBrandingAsset(domain.BrandingAssetKindAvatar, avatarStorageKey)
		if err != nil {
			return domain.Workspace{}, fmt.Errorf("hydrate workspace avatar %d: %w", workspaceID, err)
		}
		branding = branding.WithAsset(avatar)
	}
	workspace.UpdateBranding(branding)

	return workspace, nil
}

func normalizeOrganizationName(name string) (string, error) {
	placeholderID, err := domain.NewOrganizationID(1)
	if err != nil {
		return "", err
	}
	organization, err := domain.NewOrganization(placeholderID, name)
	if err != nil {
		return "", err
	}
	return organization.Name(), nil
}

func normalizeWorkspaceName(name string) (string, error) {
	placeholderWorkspaceID, err := domain.NewWorkspaceID(1)
	if err != nil {
		return "", err
	}
	placeholderOrganizationID, err := domain.NewOrganizationID(1)
	if err != nil {
		return "", err
	}
	workspace, err := domain.NewWorkspace(
		placeholderWorkspaceID,
		placeholderOrganizationID,
		name,
		domain.DefaultWorkspaceSettings(),
	)
	if err != nil {
		return "", err
	}
	return workspace.Name(), nil
}

func brandingStorageKey(branding domain.WorkspaceBranding, kind domain.BrandingAssetKind) string {
	asset, ok := branding.Asset(kind)
	if !ok {
		return ""
	}
	return asset.StorageKey()
}

func isForeignKeyViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23503"
}

func rollback(ctx context.Context, tx pgx.Tx) {
	if tx != nil {
		_ = tx.Rollback(ctx)
	}
}
