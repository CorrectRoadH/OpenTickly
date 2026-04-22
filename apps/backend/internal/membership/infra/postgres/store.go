package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// workspaceMemberColumns is the canonical column list used by every
// SELECT that hydrates a WorkspaceMemberView. Invite token fields sit at the
// end so scanWorkspaceMember can unpack them in order.
const workspaceMemberColumns = "id, workspace_id, user_id, email, full_name, role, state, hourly_rate, labor_cost, invite_token, invite_token_expires_at"

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (store *Store) EnsureOrganizationMember(
	ctx context.Context,
	command membershipapplication.EnsureOrganizationMemberCommand,
) (membershipapplication.OrganizationMemberView, error) {
	var view membershipapplication.OrganizationMemberView
	err := store.pool.QueryRow(ctx, `
		insert into membership_organization_members (organization_id, user_id, role, state)
		values ($1, $2, $3, 'joined')
		on conflict (organization_id, user_id) do update set updated_at = now()
		returning id, organization_id, user_id, role, state, created_at, updated_at
	`, command.OrganizationID, command.UserID, string(command.Role)).Scan(
		&view.ID, &view.OrganizationID, &view.UserID,
		&view.Role, &view.State, &view.CreatedAt, &view.UpdatedAt,
	)
	if err != nil {
		return membershipapplication.OrganizationMemberView{}, fmt.Errorf("ensure organization member: %w", err)
	}
	return view, nil
}

func (store *Store) ListOrganizationMembers(
	ctx context.Context,
	organizationID int64,
) ([]membershipapplication.OrganizationMemberView, error) {
	rows, err := store.pool.Query(ctx, `
		select id, organization_id, user_id, role, state, created_at, updated_at
		from membership_organization_members
		where organization_id = $1
		order by id
	`, organizationID)
	if err != nil {
		return nil, fmt.Errorf("list organization members: %w", err)
	}
	defer rows.Close()

	var members []membershipapplication.OrganizationMemberView
	for rows.Next() {
		var view membershipapplication.OrganizationMemberView
		if err := rows.Scan(
			&view.ID, &view.OrganizationID, &view.UserID,
			&view.Role, &view.State, &view.CreatedAt, &view.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan organization member: %w", err)
		}
		members = append(members, view)
	}
	return members, rows.Err()
}

func (store *Store) FindOrganizationMemberByUserID(
	ctx context.Context,
	organizationID int64,
	userID int64,
) (membershipapplication.OrganizationMemberView, bool, error) {
	var view membershipapplication.OrganizationMemberView
	err := store.pool.QueryRow(ctx, `
		select id, organization_id, user_id, role, state, created_at, updated_at
		from membership_organization_members
		where organization_id = $1 and user_id = $2
	`, organizationID, userID).Scan(
		&view.ID, &view.OrganizationID, &view.UserID,
		&view.Role, &view.State, &view.CreatedAt, &view.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return membershipapplication.OrganizationMemberView{}, false, nil
	}
	if err != nil {
		return membershipapplication.OrganizationMemberView{}, false, fmt.Errorf("find organization member: %w", err)
	}
	return view, true, nil
}

func (store *Store) EnsureWorkspaceOwner(
	ctx context.Context,
	command membershipapplication.EnsureWorkspaceOwnerCommand,
) (membershipapplication.WorkspaceMemberView, error) {
	view, ok, err := store.FindWorkspaceMemberByUserID(ctx, command.WorkspaceID, command.UserID)
	if err != nil {
		return membershipapplication.WorkspaceMemberView{}, err
	}
	if ok {
		return view, nil
	}

	email, fullName, found, err := store.lookupIdentityByUserID(ctx, command.UserID)
	if err != nil {
		return membershipapplication.WorkspaceMemberView{}, err
	}
	if !found {
		return membershipapplication.WorkspaceMemberView{}, membershipapplication.ErrWorkspaceIdentityUserNotFound
	}

	return store.insertWorkspaceMember(
		ctx,
		command.WorkspaceID,
		&command.UserID,
		email,
		fullName,
		membershipdomain.WorkspaceRoleAdmin,
		membershipdomain.WorkspaceMemberStateJoined,
		nil,
		nil,
		&command.UserID,
		nil,
		nil,
	)
}

func (store *Store) ListWorkspaceMembers(
	ctx context.Context,
	workspaceID int64,
) ([]membershipapplication.WorkspaceMemberView, error) {
	rows, err := store.pool.Query(ctx, `
		select id, workspace_id, user_id, email, full_name, role, state, hourly_rate, labor_cost, invite_token, invite_token_expires_at
		from membership_workspace_members
		where workspace_id = $1
		order by id
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("list workspace members for workspace %d: %w", workspaceID, err)
	}
	defer rows.Close()

	members := make([]membershipapplication.WorkspaceMemberView, 0)
	for rows.Next() {
		member, scanErr := scanWorkspaceMember(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		members = append(members, member)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate workspace members for workspace %d: %w", workspaceID, err)
	}
	return members, nil
}

func (store *Store) FindWorkspaceMemberByID(
	ctx context.Context,
	workspaceID int64,
	memberID int64,
) (membershipapplication.WorkspaceMemberView, bool, error) {
	row := store.pool.QueryRow(ctx, `
		select id, workspace_id, user_id, email, full_name, role, state, hourly_rate, labor_cost, invite_token, invite_token_expires_at
		from membership_workspace_members
		where workspace_id = $1 and id = $2
	`, workspaceID, memberID)
	member, err := scanWorkspaceMember(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return membershipapplication.WorkspaceMemberView{}, false, nil
		}
		return membershipapplication.WorkspaceMemberView{}, false, err
	}
	return member, true, nil
}

func (store *Store) FindWorkspaceMemberByUserID(
	ctx context.Context,
	workspaceID int64,
	userID int64,
) (membershipapplication.WorkspaceMemberView, bool, error) {
	row := store.pool.QueryRow(ctx, `
		select id, workspace_id, user_id, email, full_name, role, state, hourly_rate, labor_cost, invite_token, invite_token_expires_at
		from membership_workspace_members
		where workspace_id = $1 and user_id = $2
	`, workspaceID, userID)
	member, err := scanWorkspaceMember(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return membershipapplication.WorkspaceMemberView{}, false, nil
		}
		return membershipapplication.WorkspaceMemberView{}, false, err
	}
	return member, true, nil
}

func (store *Store) InviteWorkspaceMember(
	ctx context.Context,
	command membershipapplication.InviteWorkspaceMemberCommand,
) (membershipapplication.WorkspaceMemberView, error) {
	email := strings.ToLower(strings.TrimSpace(command.Email))
	userID, fullName, err := store.lookupIdentityByEmail(ctx, email)
	if err != nil {
		return membershipapplication.WorkspaceMemberView{}, err
	}
	if fullName == "" {
		fullName = email
	}

	role := membershipdomain.WorkspaceRoleMember
	if command.Role != nil {
		role = *command.Role
	}

	var inviteToken *string
	var inviteExpiresAt *time.Time
	if command.InviteToken != "" {
		tokenCopy := command.InviteToken
		inviteToken = &tokenCopy
	}
	if !command.InviteTokenExpiresAt.IsZero() {
		expiresCopy := command.InviteTokenExpiresAt
		inviteExpiresAt = &expiresCopy
	}

	return store.insertWorkspaceMember(
		ctx,
		command.WorkspaceID,
		userID,
		email,
		fullName,
		role,
		membershipdomain.WorkspaceMemberStateInvited,
		nil,
		nil,
		&command.RequestedBy,
		inviteToken,
		inviteExpiresAt,
	)
}

// FindWorkspaceMemberByEmail locates an existing membership row for the
// workspace/email pair regardless of state. Callers use this to decide whether
// a second Invite should rotate an existing invite (invited/removed) or be
// rejected as a conflict (joined/disabled/restored).
func (store *Store) FindWorkspaceMemberByEmail(
	ctx context.Context,
	workspaceID int64,
	email string,
) (membershipapplication.WorkspaceMemberView, bool, error) {
	normalized := strings.ToLower(strings.TrimSpace(email))
	row := store.pool.QueryRow(ctx, `
		select `+workspaceMemberColumns+`
		from membership_workspace_members
		where workspace_id = $1 and lower(email) = $2
	`, workspaceID, normalized)
	member, err := scanWorkspaceMember(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return membershipapplication.WorkspaceMemberView{}, false, nil
		}
		return membershipapplication.WorkspaceMemberView{}, false, err
	}
	return member, true, nil
}

// ReinviteWorkspaceMember rotates the invite token on an existing row whose
// state permits re-issuing an invite (invited or removed). The state is reset
// to 'invited', user_id is cleared so the recipient must re-accept, and
// created_by is updated to the latest inviter for audit purposes. Rows in
// joined/disabled/restored surface ErrWorkspaceMemberNotFound so the caller
// can fall back to the existing-member 409 path.
func (store *Store) ReinviteWorkspaceMember(
	ctx context.Context,
	command membershipapplication.ReinviteWorkspaceMemberCommand,
) (membershipapplication.WorkspaceMemberView, error) {
	role := membershipdomain.WorkspaceRoleMember
	if command.Role != nil {
		role = *command.Role
	}
	row := store.pool.QueryRow(ctx, `
		update membership_workspace_members
		set state = 'invited',
			invite_token = $3,
			invite_token_expires_at = $4,
			created_by = $5,
			role = $6,
			user_id = null,
			updated_at = now()
		where workspace_id = $1 and id = $2 and state in ('invited', 'removed')
		returning `+workspaceMemberColumns,
		command.WorkspaceID,
		command.MemberID,
		command.InviteToken,
		command.InviteTokenExpiresAt,
		command.InvitedBy,
		string(role),
	)
	member, err := scanWorkspaceMember(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return membershipapplication.WorkspaceMemberView{}, membershipapplication.ErrWorkspaceMemberNotFound
		}
		return membershipapplication.WorkspaceMemberView{}, fmt.Errorf("reinvite workspace member %d: %w", command.MemberID, err)
	}
	return member, nil
}

// ResendWorkspaceInvite refreshes an existing invited row's token and expiry.
// It only matches rows still in the invited state — consumed or removed rows
// surface as ErrWorkspaceMemberNotFound so callers get consistent 404s.
func (store *Store) ResendWorkspaceInvite(
	ctx context.Context,
	command membershipapplication.ResendWorkspaceInviteCommand,
) (membershipapplication.WorkspaceMemberView, error) {
	row := store.pool.QueryRow(ctx, `
		update membership_workspace_members
		set invite_token = $3,
			invite_token_expires_at = $4,
			updated_at = now()
		where workspace_id = $1 and id = $2 and state = 'invited'
		returning `+workspaceMemberColumns,
		command.WorkspaceID,
		command.MemberID,
		command.InviteToken,
		command.InviteTokenExpiresAt,
	)
	member, err := scanWorkspaceMember(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return membershipapplication.WorkspaceMemberView{}, membershipapplication.ErrWorkspaceMemberNotFound
		}
		return membershipapplication.WorkspaceMemberView{}, fmt.Errorf("resend workspace invite for member %d: %w", command.MemberID, err)
	}
	return member, nil
}

// FindInviteByToken returns the public-facing invite summary for the token or
// (zero, false, nil) when no row matches. Expired/consumed lifecycle states
// are surfaced via the Status field so callers can render tailored UI.
func (store *Store) FindInviteByToken(
	ctx context.Context,
	token string,
) (membershipapplication.InviteTokenInfoView, bool, error) {
	var (
		info        membershipapplication.InviteTokenInfoView
		state       string
		expiresAt   *time.Time
		inviterFull *string
		inviterMail *string
	)
	err := store.pool.QueryRow(ctx, `
		select
			m.workspace_id,
			coalesce(w.name, ''),
			w.organization_id,
			coalesce(o.name, ''),
			m.email,
			u.full_name,
			u.email,
			m.state,
			m.invite_token_expires_at
		from membership_workspace_members m
		join tenant_workspaces w on w.id = m.workspace_id
		join tenant_organizations o on o.id = w.organization_id
		left join identity_users u on u.id = m.created_by
		where m.invite_token = $1
	`, token).Scan(
		&info.WorkspaceID,
		&info.WorkspaceName,
		&info.OrganizationID,
		&info.OrganizationName,
		&info.Email,
		&inviterFull,
		&inviterMail,
		&state,
		&expiresAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return membershipapplication.InviteTokenInfoView{}, false, nil
		}
		return membershipapplication.InviteTokenInfoView{}, false, fmt.Errorf("find invite by token: %w", err)
	}

	switch inviterFull {
	case nil:
		if inviterMail != nil {
			info.InviterName = *inviterMail
		}
	default:
		name := strings.TrimSpace(*inviterFull)
		if name == "" && inviterMail != nil {
			name = *inviterMail
		}
		info.InviterName = name
	}
	info.ExpiresAt = expiresAt
	info.Status = deriveInviteStatus(membershipdomain.WorkspaceMemberState(state), expiresAt)
	return info, true, nil
}

// AcceptInvite runs the full accept-invite transaction: flip the membership
// row to joined, clear the token, upsert an organization membership, and
// pre-fill web_user_homes so the session shell doesn't auto-provision a
// personal organization for the accepted user.
func (store *Store) AcceptInvite(
	ctx context.Context,
	command membershipapplication.AcceptInviteCommand,
) (membershipapplication.AcceptedInviteView, error) {
	tx, err := store.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return membershipapplication.AcceptedInviteView{}, fmt.Errorf("begin accept invite tx: %w", err)
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	var (
		workspaceID    int64
		organizationID int64
	)
	err = tx.QueryRow(ctx, `
		update membership_workspace_members
		set user_id = $2,
			state = 'joined',
			invite_token = null,
			invite_token_expires_at = null,
			updated_at = now()
		where invite_token = $1
		  and state = 'invited'
		  and (invite_token_expires_at is null or invite_token_expires_at > now())
		returning workspace_id
	`, command.Token, command.UserID).Scan(&workspaceID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return membershipapplication.AcceptedInviteView{}, membershipapplication.ErrInviteTokenInvalid
		}
		return membershipapplication.AcceptedInviteView{}, fmt.Errorf("accept workspace invite: %w", err)
	}

	var (
		workspaceName    string
		organizationName string
	)
	if err := tx.QueryRow(ctx, `
		select w.organization_id, coalesce(w.name, ''), coalesce(o.name, '')
		from tenant_workspaces w
		join tenant_organizations o on o.id = w.organization_id
		where w.id = $1
	`, workspaceID).Scan(&organizationID, &workspaceName, &organizationName); err != nil {
		return membershipapplication.AcceptedInviteView{}, fmt.Errorf("load workspace after accept: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		insert into membership_organization_members (organization_id, user_id, role, state)
		values ($1, $2, 'member', 'joined')
		on conflict (organization_id, user_id) do update set updated_at = now()
	`, organizationID, command.UserID); err != nil {
		return membershipapplication.AcceptedInviteView{}, fmt.Errorf("upsert org member on accept: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		insert into web_user_homes (user_id, organization_id, workspace_id)
		values ($1, $2, $3)
		on conflict (user_id) do nothing
	`, command.UserID, organizationID, workspaceID); err != nil {
		return membershipapplication.AcceptedInviteView{}, fmt.Errorf("upsert user home on accept: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return membershipapplication.AcceptedInviteView{}, fmt.Errorf("commit accept invite: %w", err)
	}
	committed = true
	return membershipapplication.AcceptedInviteView{
		WorkspaceID:      workspaceID,
		WorkspaceName:    workspaceName,
		OrganizationID:   organizationID,
		OrganizationName: organizationName,
	}, nil
}

// WorkspaceName is a narrow read used by the membership service for email
// template copy. It is declared here so the service can rely on the Store via
// an internal interface assertion without widening the application-layer
// contract with tenant-specific lookups.
func (store *Store) WorkspaceName(
	ctx context.Context,
	workspaceID int64,
) (string, bool, error) {
	var name string
	err := store.pool.QueryRow(ctx, `
		select coalesce(name, '') from tenant_workspaces where id = $1
	`, workspaceID).Scan(&name)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", false, nil
		}
		return "", false, fmt.Errorf("lookup workspace name %d: %w", workspaceID, err)
	}
	return name, true, nil
}

func deriveInviteStatus(state membershipdomain.WorkspaceMemberState, expiresAt *time.Time) membershipapplication.InviteTokenStatus {
	if state != membershipdomain.WorkspaceMemberStateInvited {
		return membershipapplication.InviteTokenStatusConsumed
	}
	if expiresAt != nil && time.Now().After(*expiresAt) {
		return membershipapplication.InviteTokenStatusExpired
	}
	return membershipapplication.InviteTokenStatusPending
}

func (store *Store) SaveWorkspaceMember(
	ctx context.Context,
	member membershipapplication.WorkspaceMemberView,
) error {
	commandTag, err := store.pool.Exec(ctx, `
		update membership_workspace_members
		set full_name = $4,
			role = $5,
			state = $6,
			hourly_rate = $7,
			labor_cost = $8,
			invite_token = $9,
			invite_token_expires_at = $10,
			updated_at = now()
		where workspace_id = $1 and id = $2 and email = $3
	`,
		member.WorkspaceID,
		member.ID,
		member.Email,
		member.FullName,
		string(member.Role),
		string(member.State),
		member.HourlyRate,
		member.LaborCost,
		member.InviteToken,
		member.InviteTokenExpiresAt,
	)
	if err != nil {
		return fmt.Errorf("save workspace member %d for workspace %d: %w", member.ID, member.WorkspaceID, err)
	}
	if commandTag.RowsAffected() != 1 {
		return membershipapplication.ErrWorkspaceMemberNotFound
	}
	return nil
}

func (store *Store) insertWorkspaceMember(
	ctx context.Context,
	workspaceID int64,
	userID *int64,
	email string,
	fullName string,
	role membershipdomain.WorkspaceRole,
	state membershipdomain.WorkspaceMemberState,
	hourlyRate *float64,
	laborCost *float64,
	createdBy *int64,
	inviteToken *string,
	inviteTokenExpiresAt *time.Time,
) (membershipapplication.WorkspaceMemberView, error) {
	row := store.pool.QueryRow(ctx, `
		insert into membership_workspace_members (
			workspace_id,
			user_id,
			email,
			full_name,
			role,
			state,
			hourly_rate,
			labor_cost,
			invite_token,
			invite_token_expires_at,
			created_by
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		returning `+workspaceMemberColumns,
		workspaceID, userID, email, strings.TrimSpace(fullName), string(role), string(state),
		hourlyRate, laborCost, inviteToken, inviteTokenExpiresAt, createdBy,
	)

	member, err := scanWorkspaceMember(row)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return membershipapplication.WorkspaceMemberView{}, membershipapplication.ErrWorkspaceMemberExists
		}
		return membershipapplication.WorkspaceMemberView{}, err
	}
	return member, nil
}

func (store *Store) lookupIdentityByEmail(
	ctx context.Context,
	email string,
) (userID *int64, fullName string, err error) {
	row := store.pool.QueryRow(ctx, `
		select id, full_name
		from identity_users
		where lower(email) = $1
	`, email)

	var rawUserID int64
	if err := row.Scan(&rawUserID, &fullName); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, "", nil
		}
		return nil, "", fmt.Errorf("lookup identity user by email %q: %w", email, err)
	}
	return &rawUserID, fullName, nil
}

func (store *Store) lookupIdentityByUserID(
	ctx context.Context,
	userID int64,
) (email string, fullName string, found bool, err error) {
	row := store.pool.QueryRow(ctx, `
		select email, full_name
		from identity_users
		where id = $1
	`, userID)

	if err := row.Scan(&email, &fullName); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", false, nil
		}
		return "", "", false, fmt.Errorf("lookup identity user by id %d: %w", userID, err)
	}
	return email, fullName, true, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanWorkspaceMember(row rowScanner) (membershipapplication.WorkspaceMemberView, error) {
	var member membershipapplication.WorkspaceMemberView
	var role string
	var state string
	if err := row.Scan(
		&member.ID,
		&member.WorkspaceID,
		&member.UserID,
		&member.Email,
		&member.FullName,
		&role,
		&state,
		&member.HourlyRate,
		&member.LaborCost,
		&member.InviteToken,
		&member.InviteTokenExpiresAt,
	); err != nil {
		return membershipapplication.WorkspaceMemberView{}, err
	}

	member.Role = normalizeWorkspaceRole(role)
	member.State = membershipdomain.WorkspaceMemberState(state)
	return member, nil
}

// normalizeWorkspaceRole maps legacy DB values to current domain roles.
// v0.0.17 stored "owner"; current schema uses "admin".
func normalizeWorkspaceRole(raw string) membershipdomain.WorkspaceRole {
	if raw == "owner" {
		return membershipdomain.WorkspaceRoleAdmin
	}
	return membershipdomain.WorkspaceRole(raw)
}
