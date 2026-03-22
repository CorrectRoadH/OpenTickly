package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
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
		membershipdomain.WorkspaceRoleOwner,
		membershipdomain.WorkspaceMemberStateJoined,
		nil,
		nil,
		&command.UserID,
	)
}

func (store *Store) ListWorkspaceMembers(
	ctx context.Context,
	workspaceID int64,
) ([]membershipapplication.WorkspaceMemberView, error) {
	rows, err := store.pool.Query(ctx, `
		select id, workspace_id, user_id, email, full_name, role, state, hourly_rate, labor_cost
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
		select id, workspace_id, user_id, email, full_name, role, state, hourly_rate, labor_cost
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
		select id, workspace_id, user_id, email, full_name, role, state, hourly_rate, labor_cost
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
	)
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
			created_by
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		returning id, workspace_id, user_id, email, full_name, role, state, hourly_rate, labor_cost
	`, workspaceID, userID, email, strings.TrimSpace(fullName), string(role), string(state), hourlyRate, laborCost, createdBy)

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
	); err != nil {
		return membershipapplication.WorkspaceMemberView{}, err
	}

	member.Role = membershipdomain.WorkspaceRole(role)
	member.State = membershipdomain.WorkspaceMemberState(state)
	return member, nil
}
