package postgres

import (
	"context"
	"errors"
	"fmt"

	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"

	"github.com/jackc/pgx/v5"
)

func (store *Store) CreateOrganizationInvitations(
	ctx context.Context,
	command membershipapplication.CreateOrganizationInvitationsCommand,
) ([]membershipapplication.OrganizationInvitationView, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin organization invitations tx: %w", err)
	}
	defer tx.Rollback(ctx)

	invitations := make([]membershipapplication.OrganizationInvitationView, 0, len(command.Invitations))
	for _, invitation := range command.Invitations {
		var view membershipapplication.OrganizationInvitationView
		err := tx.QueryRow(ctx, `
			insert into membership_organization_invitations (
				organization_id,
				organization_name,
				code,
				email,
				sender_user_id,
				sender_name,
				sender_email,
				status
			) values ($1, $2, $3, $4, $5, $6, $7, $8)
			returning id, organization_id, organization_name, code, email, sender_user_id, sender_name, sender_email, recipient_user_id, status, created_at, updated_at
		`,
			command.OrganizationID,
			command.OrganizationName,
			invitation.Code,
			invitation.Email,
			command.SenderUserID,
			command.SenderName,
			command.SenderEmail,
			string(membershipapplication.InvitationStatusPending),
		).Scan(
			&view.ID,
			&view.OrganizationID,
			&view.OrganizationName,
			&view.Code,
			&view.Email,
			&view.SenderUserID,
			&view.SenderName,
			&view.SenderEmail,
			&view.RecipientUserID,
			&view.Status,
			&view.CreatedAt,
			&view.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("insert organization invitation: %w", err)
		}

		view.Workspaces = make([]membershipapplication.OrganizationInvitationWorkspaceView, 0, len(command.Workspaces))
		for _, workspace := range command.Workspaces {
			if _, err := tx.Exec(ctx, `
				insert into membership_organization_invitation_workspaces (
					invitation_id,
					workspace_id
				) values ($1, $2)
			`, view.ID, workspace.WorkspaceID); err != nil {
				return nil, fmt.Errorf("insert invitation workspace: %w", err)
			}
			view.Workspaces = append(view.Workspaces, membershipapplication.OrganizationInvitationWorkspaceView{
				WorkspaceID: workspace.WorkspaceID,
			})
		}
		invitations = append(invitations, view)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit organization invitations tx: %w", err)
	}
	return invitations, nil
}

func (store *Store) GetOrganizationInvitationByCode(
	ctx context.Context,
	code string,
) (membershipapplication.OrganizationInvitationView, bool, error) {
	row := store.pool.QueryRow(ctx, `
		select id, organization_id, organization_name, code, email, sender_user_id, sender_name, sender_email, recipient_user_id, status, created_at, updated_at
		from membership_organization_invitations
		where code = $1
	`, code)
	invitation, err := scanOrganizationInvitation(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return membershipapplication.OrganizationInvitationView{}, false, nil
		}
		return membershipapplication.OrganizationInvitationView{}, false, fmt.Errorf("get organization invitation by code: %w", err)
	}
	workspaces, err := store.listInvitationWorkspaces(ctx, invitation.ID)
	if err != nil {
		return membershipapplication.OrganizationInvitationView{}, false, err
	}
	invitation.Workspaces = workspaces
	return invitation, true, nil
}

func (store *Store) GetOrganizationInvitationByID(
	ctx context.Context,
	organizationID int64,
	invitationID int64,
) (membershipapplication.OrganizationInvitationView, bool, error) {
	row := store.pool.QueryRow(ctx, `
		select id, organization_id, organization_name, code, email, sender_user_id, sender_name, sender_email, recipient_user_id, status, created_at, updated_at
		from membership_organization_invitations
		where organization_id = $1 and id = $2
	`, organizationID, invitationID)
	invitation, err := scanOrganizationInvitation(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return membershipapplication.OrganizationInvitationView{}, false, nil
		}
		return membershipapplication.OrganizationInvitationView{}, false, fmt.Errorf("get organization invitation by id: %w", err)
	}
	workspaces, err := store.listInvitationWorkspaces(ctx, invitation.ID)
	if err != nil {
		return membershipapplication.OrganizationInvitationView{}, false, err
	}
	invitation.Workspaces = workspaces
	return invitation, true, nil
}

func (store *Store) UpdateOrganizationInvitationStatus(
	ctx context.Context,
	code string,
	status membershipapplication.InvitationStatus,
) (membershipapplication.OrganizationInvitationView, bool, error) {
	row := store.pool.QueryRow(ctx, `
		update membership_organization_invitations
		set status = case when status = 'pending' then $2 else status end,
			updated_at = now()
		where code = $1
		returning id, organization_id, organization_name, code, email, sender_user_id, sender_name, sender_email, recipient_user_id, status, created_at, updated_at
	`, code, string(status))
	invitation, err := scanOrganizationInvitation(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return membershipapplication.OrganizationInvitationView{}, false, nil
		}
		return membershipapplication.OrganizationInvitationView{}, false, fmt.Errorf("update organization invitation status: %w", err)
	}
	workspaces, err := store.listInvitationWorkspaces(ctx, invitation.ID)
	if err != nil {
		return membershipapplication.OrganizationInvitationView{}, false, err
	}
	invitation.Workspaces = workspaces
	return invitation, true, nil
}

func (store *Store) TouchOrganizationInvitation(
	ctx context.Context,
	organizationID int64,
	invitationID int64,
) (membershipapplication.OrganizationInvitationView, bool, error) {
	row := store.pool.QueryRow(ctx, `
		update membership_organization_invitations
		set updated_at = now()
		where organization_id = $1 and id = $2
		returning id, organization_id, organization_name, code, email, sender_user_id, sender_name, sender_email, recipient_user_id, status, created_at, updated_at
	`, organizationID, invitationID)
	invitation, err := scanOrganizationInvitation(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return membershipapplication.OrganizationInvitationView{}, false, nil
		}
		return membershipapplication.OrganizationInvitationView{}, false, fmt.Errorf("touch organization invitation: %w", err)
	}
	workspaces, err := store.listInvitationWorkspaces(ctx, invitation.ID)
	if err != nil {
		return membershipapplication.OrganizationInvitationView{}, false, err
	}
	invitation.Workspaces = workspaces
	return invitation, true, nil
}

func (store *Store) listInvitationWorkspaces(
	ctx context.Context,
	invitationID int64,
) ([]membershipapplication.OrganizationInvitationWorkspaceView, error) {
	rows, err := store.pool.Query(ctx, `
		select workspace_id, user_id, workspace_user_id
		from membership_organization_invitation_workspaces
		where invitation_id = $1
		order by workspace_id
	`, invitationID)
	if err != nil {
		return nil, fmt.Errorf("list invitation workspaces: %w", err)
	}
	defer rows.Close()

	workspaces := make([]membershipapplication.OrganizationInvitationWorkspaceView, 0)
	for rows.Next() {
		var workspace membershipapplication.OrganizationInvitationWorkspaceView
		if err := rows.Scan(&workspace.WorkspaceID, &workspace.UserID, &workspace.WorkspaceUserID); err != nil {
			return nil, fmt.Errorf("scan invitation workspace: %w", err)
		}
		workspaces = append(workspaces, workspace)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate invitation workspaces: %w", err)
	}
	return workspaces, nil
}

func scanOrganizationInvitation(row rowScanner) (membershipapplication.OrganizationInvitationView, error) {
	var invitation membershipapplication.OrganizationInvitationView
	if err := row.Scan(
		&invitation.ID,
		&invitation.OrganizationID,
		&invitation.OrganizationName,
		&invitation.Code,
		&invitation.Email,
		&invitation.SenderUserID,
		&invitation.SenderName,
		&invitation.SenderEmail,
		&invitation.RecipientUserID,
		&invitation.Status,
		&invitation.CreatedAt,
		&invitation.UpdatedAt,
	); err != nil {
		return membershipapplication.OrganizationInvitationView{}, err
	}
	return invitation, nil
}
