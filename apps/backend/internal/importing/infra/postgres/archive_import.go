package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	importingapplication "opentoggl/backend/apps/backend/internal/importing/application"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type importedIDBinding struct {
	SourceID int64
	TargetID int64
}

type importedIDBindings struct {
	Items []importedIDBinding
}

func (bindings *importedIDBindings) Add(sourceID int64, targetID int64) {
	if sourceID <= 0 || targetID <= 0 {
		return
	}
	for index := range bindings.Items {
		if bindings.Items[index].SourceID == sourceID {
			bindings.Items[index].TargetID = targetID
			return
		}
	}
	bindings.Items = append(bindings.Items, importedIDBinding{
		SourceID: sourceID,
		TargetID: targetID,
	})
}

func (bindings importedIDBindings) Resolve(sourceID int64) (int64, bool) {
	if sourceID <= 0 {
		return 0, false
	}
	for _, binding := range bindings.Items {
		if binding.SourceID == sourceID {
			return binding.TargetID, true
		}
	}
	return 0, false
}

type archiveImporter struct {
	archive     importingapplication.ImportedArchive
	clientIDs   importedIDBindings
	projectIDs  importedIDBindings
	requestedBy int64
	tx          pgx.Tx
	userIDs     importedIDBindings
	workspaceID int64
}

func (store *Store) ImportWorkspaceArchive(
	ctx context.Context,
	command importingapplication.ImportWorkspaceArchiveCommand,
) error {
	tx, err := store.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin import transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	importer := archiveImporter{
		archive:     command.Archive,
		requestedBy: command.RequestedBy,
		tx:          tx,
		workspaceID: command.WorkspaceID,
	}
	if err := importer.importWorkspaceUsers(ctx); err != nil {
		return err
	}
	if err := importer.importClients(ctx); err != nil {
		return err
	}
	if err := importer.importTags(ctx); err != nil {
		return err
	}
	if err := importer.importProjects(ctx); err != nil {
		return err
	}
	if err := importer.importProjectUsers(ctx); err != nil {
		return err
	}
	if err := importer.syncSequences(ctx); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit import transaction: %w", err)
	}
	return nil
}

func (importer *archiveImporter) importWorkspaceUsers(ctx context.Context) error {
	for _, workspaceUser := range importer.archive.WorkspaceUsers.Items {
		userID, err := importer.ensureIdentityUser(ctx, workspaceUser)
		if err != nil {
			return err
		}
		importer.userIDs.Add(workspaceUser.UID, userID)
		if err := importer.ensureWorkspaceMember(ctx, workspaceUser, userID); err != nil {
			return err
		}
	}
	return nil
}

func (importer *archiveImporter) importClients(ctx context.Context) error {
	for _, client := range importer.archive.Clients.Items {
		clientID, err := importer.ensureClient(ctx, client)
		if err != nil {
			return err
		}
		importer.clientIDs.Add(client.ID, clientID)
	}
	return nil
}

func (importer *archiveImporter) importTags(ctx context.Context) error {
	for _, tag := range importer.archive.Tags.Items {
		if err := importer.ensureTag(ctx, tag); err != nil {
			return err
		}
	}
	return nil
}

func (importer *archiveImporter) importProjects(ctx context.Context) error {
	for _, project := range importer.archive.Projects.Items {
		projectID, err := importer.ensureProject(ctx, project)
		if err != nil {
			return err
		}
		importer.projectIDs.Add(project.ID, projectID)
	}
	return nil
}

func (importer *archiveImporter) importProjectUsers(ctx context.Context) error {
	for _, projectUser := range importer.archive.ProjectUsers.Items {
		projectID, ok := importer.projectIDs.Resolve(projectUser.ProjectID)
		if !ok {
			continue
		}
		userID, ok := importer.userIDs.Resolve(projectUser.UserID)
		if !ok {
			continue
		}

		role := "member"
		if projectUser.Manager {
			role = "admin"
		}
		if _, err := importer.tx.Exec(ctx, `
			insert into catalog_project_users (project_id, user_id, role)
			values ($1, $2, $3)
			on conflict (project_id, user_id) do update
			set role = excluded.role
		`, projectID, userID, role); err != nil {
			return fmt.Errorf("import project user project=%d user=%d: %w", projectUser.ProjectID, projectUser.UserID, err)
		}
	}
	return nil
}

func (importer *archiveImporter) ensureIdentityUser(
	ctx context.Context,
	workspaceUser importingapplication.ImportedWorkspaceUser,
) (int64, error) {
	normalizedEmail := normalizedImportedEmail(workspaceUser.Email, workspaceUser.UID)
	if workspaceUser.UID > 0 {
		var existingID int64
		err := importer.tx.QueryRow(ctx, `
			select id
			from identity_users
			where id = $1
		`, workspaceUser.UID).Scan(&existingID)
		switch {
		case err == nil:
			if err := importer.updateIdentityUser(ctx, existingID, normalizedEmail, workspaceUser); err != nil {
				return 0, err
			}
			return existingID, nil
		case !errors.Is(err, pgx.ErrNoRows):
			return 0, fmt.Errorf("lookup identity user by id %d: %w", workspaceUser.UID, err)
		}
	}

	var existingByEmail int64
	err := importer.tx.QueryRow(ctx, `
		select id
		from identity_users
		where lower(email) = lower($1)
	`, normalizedEmail).Scan(&existingByEmail)
	switch {
	case err == nil:
		if err := importer.updateIdentityUser(ctx, existingByEmail, normalizedEmail, workspaceUser); err != nil {
			return 0, err
		}
		return existingByEmail, nil
	case !errors.Is(err, pgx.ErrNoRows):
		return 0, fmt.Errorf("lookup identity user by email %q: %w", normalizedEmail, err)
	}

	if workspaceUser.UID > 0 {
		userID, inserted, err := importer.insertIdentityUserWithID(ctx, workspaceUser.UID, normalizedEmail, workspaceUser)
		if err != nil {
			return 0, err
		}
		if inserted {
			return userID, nil
		}
	}
	return importer.insertIdentityUser(ctx, normalizedEmail, workspaceUser)
}

func (importer *archiveImporter) updateIdentityUser(
	ctx context.Context,
	userID int64,
	email string,
	workspaceUser importingapplication.ImportedWorkspaceUser,
) error {
	fullName := strings.TrimSpace(workspaceUser.Name)
	if fullName == "" {
		fullName = email
	}
	timezone := strings.TrimSpace(workspaceUser.Timezone)
	if timezone == "" {
		timezone = "UTC"
	}
	_, err := importer.tx.Exec(ctx, `
		update identity_users
		set email = $2,
			full_name = $3,
			timezone = $4,
			default_workspace_id = $5
		where id = $1
	`, userID, email, fullName, timezone, importer.workspaceID)
	if err != nil {
		return fmt.Errorf("update identity user %d: %w", userID, err)
	}
	return nil
}

func (importer *archiveImporter) insertIdentityUserWithID(
	ctx context.Context,
	userID int64,
	email string,
	workspaceUser importingapplication.ImportedWorkspaceUser,
) (int64, bool, error) {
	insertedID, err := importer.insertIdentityUserRow(ctx, &userID, email, workspaceUser)
	if err == nil {
		return insertedID, true, nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return 0, false, nil
	}
	return 0, false, err
}

func (importer *archiveImporter) insertIdentityUser(
	ctx context.Context,
	email string,
	workspaceUser importingapplication.ImportedWorkspaceUser,
) (int64, error) {
	return importer.insertIdentityUserRow(ctx, nil, email, workspaceUser)
}

func (importer *archiveImporter) insertIdentityUserRow(
	ctx context.Context,
	userID *int64,
	email string,
	workspaceUser importingapplication.ImportedWorkspaceUser,
) (int64, error) {
	fullName := strings.TrimSpace(workspaceUser.Name)
	if fullName == "" {
		fullName = email
	}
	timezone := strings.TrimSpace(workspaceUser.Timezone)
	if timezone == "" {
		timezone = "UTC"
	}
	passwordHash := fmt.Sprintf("imported-user-%d", workspaceUser.UID)
	apiToken := fmt.Sprintf("imported-token-%d", workspaceUser.UID)
	productCode := fmt.Sprintf("imported-product-%d", workspaceUser.UID)
	weeklyCode := fmt.Sprintf("imported-weekly-%d", workspaceUser.UID)

	var row pgx.Row
	if userID != nil {
		row = importer.tx.QueryRow(ctx, `
			insert into identity_users (
				id,
				email,
				full_name,
				password_hash,
				api_token,
				timezone,
				default_workspace_id,
				state,
				product_emails_disable_code,
				weekly_report_disable_code
			) values ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9)
			returning id
		`, *userID, email, fullName, passwordHash, apiToken, timezone, importer.workspaceID, productCode, weeklyCode)
	} else {
		row = importer.tx.QueryRow(ctx, `
			insert into identity_users (
				email,
				full_name,
				password_hash,
				api_token,
				timezone,
				default_workspace_id,
				state,
				product_emails_disable_code,
				weekly_report_disable_code
			) values ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
			returning id
		`, email, fullName, passwordHash, apiToken, timezone, importer.workspaceID, productCode, weeklyCode)
	}

	var insertedID int64
	if err := row.Scan(&insertedID); err != nil {
		return 0, fmt.Errorf("insert identity user %q: %w", email, err)
	}
	return insertedID, nil
}

func (importer *archiveImporter) ensureWorkspaceMember(
	ctx context.Context,
	workspaceUser importingapplication.ImportedWorkspaceUser,
	userID int64,
) error {
	memberID, found, err := importer.findWorkspaceMember(ctx, workspaceUser, userID)
	if err != nil {
		return err
	}
	role := importedWorkspaceRole(workspaceUser)
	state := importedWorkspaceState(workspaceUser)
	if found {
		if err := importer.updateWorkspaceMember(ctx, memberID, workspaceUser, userID, role, state); err != nil {
			return err
		}
		return nil
	}

	if workspaceUser.ID > 0 {
		inserted, insertErr := importer.insertWorkspaceMemberWithID(ctx, workspaceUser.ID, workspaceUser, userID, role, state)
		if insertErr != nil {
			return insertErr
		}
		if inserted {
			return nil
		}
	}
	return importer.insertWorkspaceMember(ctx, workspaceUser, userID, role, state)
}

func (importer *archiveImporter) findWorkspaceMember(
	ctx context.Context,
	workspaceUser importingapplication.ImportedWorkspaceUser,
	userID int64,
) (int64, bool, error) {
	if workspaceUser.ID > 0 {
		memberID, found, err := importer.findWorkspaceMemberByID(ctx, workspaceUser.ID)
		if err != nil || found {
			return memberID, found, err
		}
	}
	memberID, found, err := importer.findWorkspaceMemberByUserID(ctx, userID)
	if err != nil || found {
		return memberID, found, err
	}
	return importer.findWorkspaceMemberByEmail(ctx, normalizedImportedEmail(workspaceUser.Email, workspaceUser.UID))
}

func (importer *archiveImporter) findWorkspaceMemberByID(ctx context.Context, memberID int64) (int64, bool, error) {
	var existingID int64
	err := importer.tx.QueryRow(ctx, `
		select id
		from membership_workspace_members
		where workspace_id = $1 and id = $2
	`, importer.workspaceID, memberID).Scan(&existingID)
	switch {
	case err == nil:
		return existingID, true, nil
	case errors.Is(err, pgx.ErrNoRows):
		return 0, false, nil
	default:
		return 0, false, fmt.Errorf("lookup workspace member by id %d: %w", memberID, err)
	}
}

func (importer *archiveImporter) findWorkspaceMemberByUserID(ctx context.Context, userID int64) (int64, bool, error) {
	var memberID int64
	err := importer.tx.QueryRow(ctx, `
		select id
		from membership_workspace_members
		where workspace_id = $1 and user_id = $2
	`, importer.workspaceID, userID).Scan(&memberID)
	switch {
	case err == nil:
		return memberID, true, nil
	case errors.Is(err, pgx.ErrNoRows):
		return 0, false, nil
	default:
		return 0, false, fmt.Errorf("lookup workspace member by user %d: %w", userID, err)
	}
}

func (importer *archiveImporter) findWorkspaceMemberByEmail(ctx context.Context, email string) (int64, bool, error) {
	var memberID int64
	err := importer.tx.QueryRow(ctx, `
		select id
		from membership_workspace_members
		where workspace_id = $1 and lower(email) = lower($2)
	`, importer.workspaceID, email).Scan(&memberID)
	switch {
	case err == nil:
		return memberID, true, nil
	case errors.Is(err, pgx.ErrNoRows):
		return 0, false, nil
	default:
		return 0, false, fmt.Errorf("lookup workspace member by email %q: %w", email, err)
	}
}

func (importer *archiveImporter) updateWorkspaceMember(
	ctx context.Context,
	memberID int64,
	workspaceUser importingapplication.ImportedWorkspaceUser,
	userID int64,
	role membershipdomain.WorkspaceRole,
	state membershipdomain.WorkspaceMemberState,
) error {
	var existingRole string
	if err := importer.tx.QueryRow(ctx, `
		select role
		from membership_workspace_members
		where workspace_id = $1 and id = $2
	`, importer.workspaceID, memberID).Scan(&existingRole); err != nil {
		return fmt.Errorf("load workspace member %d role: %w", memberID, err)
	}
	if existingRole == string(membershipdomain.WorkspaceRoleOwner) {
		role = membershipdomain.WorkspaceRoleOwner
		state = membershipdomain.WorkspaceMemberStateJoined
	}

	fullName := strings.TrimSpace(workspaceUser.Name)
	if fullName == "" {
		fullName = normalizedImportedEmail(workspaceUser.Email, workspaceUser.UID)
	}
	_, err := importer.tx.Exec(ctx, `
		update membership_workspace_members
		set user_id = $3,
			email = $4,
			full_name = $5,
			role = $6,
			state = $7,
			updated_at = now()
		where workspace_id = $1 and id = $2
	`, importer.workspaceID, memberID, userID, normalizedImportedEmail(workspaceUser.Email, workspaceUser.UID), fullName, string(role), string(state))
	if err != nil {
		return fmt.Errorf("update workspace member %d: %w", memberID, err)
	}
	return nil
}

func (importer *archiveImporter) insertWorkspaceMemberWithID(
	ctx context.Context,
	memberID int64,
	workspaceUser importingapplication.ImportedWorkspaceUser,
	userID int64,
	role membershipdomain.WorkspaceRole,
	state membershipdomain.WorkspaceMemberState,
) (bool, error) {
	fullName := strings.TrimSpace(workspaceUser.Name)
	if fullName == "" {
		fullName = normalizedImportedEmail(workspaceUser.Email, workspaceUser.UID)
	}
	_, err := importer.tx.Exec(ctx, `
		insert into membership_workspace_members (
			id,
			workspace_id,
			user_id,
			email,
			full_name,
			role,
			state,
			created_by
		) values ($1, $2, $3, $4, $5, $6, $7, $8)
	`, memberID, importer.workspaceID, userID, normalizedImportedEmail(workspaceUser.Email, workspaceUser.UID), fullName, string(role), string(state), importer.requestedBy)
	if err == nil {
		return true, nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return false, nil
	}
	return false, fmt.Errorf("insert workspace member %d: %w", memberID, err)
}

func (importer *archiveImporter) insertWorkspaceMember(
	ctx context.Context,
	workspaceUser importingapplication.ImportedWorkspaceUser,
	userID int64,
	role membershipdomain.WorkspaceRole,
	state membershipdomain.WorkspaceMemberState,
) error {
	fullName := strings.TrimSpace(workspaceUser.Name)
	if fullName == "" {
		fullName = normalizedImportedEmail(workspaceUser.Email, workspaceUser.UID)
	}
	_, err := importer.tx.Exec(ctx, `
		insert into membership_workspace_members (
			workspace_id,
			user_id,
			email,
			full_name,
			role,
			state,
			created_by
		) values ($1, $2, $3, $4, $5, $6, $7)
	`, importer.workspaceID, userID, normalizedImportedEmail(workspaceUser.Email, workspaceUser.UID), fullName, string(role), string(state), importer.requestedBy)
	if err != nil {
		return fmt.Errorf("insert workspace member for user %d: %w", userID, err)
	}
	return nil
}

func (importer *archiveImporter) ensureClient(
	ctx context.Context,
	client importingapplication.ImportedClient,
) (int64, error) {
	createdBy := importer.createdByPointer(client.CreatorID)
	if existingID, found, err := importer.findScopedObjectByID(ctx, "catalog_clients", client.ID); err != nil {
		return 0, err
	} else if found {
		if _, err := importer.tx.Exec(ctx, `
			update catalog_clients
			set name = $3,
				archived = $4,
				created_by = $5
			where workspace_id = $1 and id = $2
		`, importer.workspaceID, existingID, strings.TrimSpace(client.Name), client.Archived, createdBy); err != nil {
			return 0, fmt.Errorf("update client %d: %w", existingID, err)
		}
		return existingID, nil
	}
	if existingID, found, err := importer.findScopedObjectByName(ctx, "catalog_clients", client.Name); err != nil {
		return 0, err
	} else if found {
		if _, err := importer.tx.Exec(ctx, `
			update catalog_clients
			set archived = $3,
				created_by = $4
			where workspace_id = $1 and id = $2
		`, importer.workspaceID, existingID, client.Archived, createdBy); err != nil {
			return 0, fmt.Errorf("update client %d by name: %w", existingID, err)
		}
		return existingID, nil
	}
	return importer.insertScopedClient(ctx, client, createdBy)
}

func (importer *archiveImporter) ensureTag(ctx context.Context, tag importingapplication.ImportedTag) error {
	createdBy := importer.createdByPointer(tag.CreatorID)
	if existingID, found, err := importer.findScopedObjectByID(ctx, "catalog_tags", tag.ID); err != nil {
		return err
	} else if found {
		_, err := importer.tx.Exec(ctx, `
			update catalog_tags
			set name = $3,
				deleted_at = null,
				created_by = $4
			where workspace_id = $1 and id = $2
		`, importer.workspaceID, existingID, strings.TrimSpace(tag.Name), createdBy)
		if err != nil {
			return fmt.Errorf("update tag %d: %w", existingID, err)
		}
		return nil
	}
	if existingID, found, err := importer.findScopedObjectByName(ctx, "catalog_tags", tag.Name); err != nil {
		return err
	} else if found {
		_, err := importer.tx.Exec(ctx, `
			update catalog_tags
			set deleted_at = null,
				created_by = $3
			where workspace_id = $1 and id = $2
		`, importer.workspaceID, existingID, createdBy)
		if err != nil {
			return fmt.Errorf("update tag %d by name: %w", existingID, err)
		}
		return nil
	}
	return importer.insertScopedTag(ctx, tag, createdBy)
}

func (importer *archiveImporter) ensureProject(
	ctx context.Context,
	project importingapplication.ImportedProject,
) (int64, error) {
	createdBy := importer.createdByPointer(0)
	clientID := importer.resolveImportedClientID(project)
	color := importedProjectColor(project)
	startDate := importedDatePointer(project.StartDate)
	if existingID, found, err := importer.findScopedObjectByID(ctx, "catalog_projects", project.ID); err != nil {
		return 0, err
	} else if found {
		if _, err := importer.tx.Exec(ctx, `
			update catalog_projects
			set client_id = $3, name = $4, active = $5, pinned = $6, actual_seconds = $7,
				created_by = $8, color = $9, billable = $10, is_private = $11, template = $12,
				recurring = $13, start_date = $14, estimated_seconds = $15, fixed_fee = $16,
				currency = $17, rate = $18
			where workspace_id = $1 and id = $2
		`, importer.workspaceID, existingID, clientID, strings.TrimSpace(project.Name), project.Active,
			project.Pinned, project.ActualSeconds, createdBy, color, project.Billable, project.IsPrivate,
			project.Template, project.Recurring, startDate, project.EstimatedSeconds, project.FixedFee,
			project.Currency, project.Rate); err != nil {
			return 0, fmt.Errorf("update project %d: %w", existingID, err)
		}
		return existingID, nil
	}
	if existingID, found, err := importer.findScopedObjectByName(ctx, "catalog_projects", project.Name); err != nil {
		return 0, err
	} else if found {
		if _, err := importer.tx.Exec(ctx, `
			update catalog_projects
			set client_id = $3, active = $4, pinned = $5, actual_seconds = $6, created_by = $7,
				color = $8, billable = $9, is_private = $10, template = $11, recurring = $12,
				start_date = $13, estimated_seconds = $14, fixed_fee = $15, currency = $16, rate = $17
			where workspace_id = $1 and id = $2
		`, importer.workspaceID, existingID, clientID, project.Active, project.Pinned, project.ActualSeconds,
			createdBy, color, project.Billable, project.IsPrivate, project.Template, project.Recurring,
			startDate, project.EstimatedSeconds, project.FixedFee, project.Currency, project.Rate); err != nil {
			return 0, fmt.Errorf("update project %d by name: %w", existingID, err)
		}
		return existingID, nil
	}
	return importer.insertScopedProject(ctx, project, clientID, createdBy, color, startDate)
}

func (importer *archiveImporter) insertScopedClient(
	ctx context.Context,
	client importingapplication.ImportedClient,
	createdBy *int64,
) (int64, error) {
	insertedID, inserted, err := importer.insertClientWithID(ctx, client.ID, client.Name, client.Archived, createdBy)
	if err != nil {
		return 0, err
	}
	if inserted {
		return insertedID, nil
	}

	err = importer.tx.QueryRow(ctx, `
		insert into catalog_clients (workspace_id, name, archived, created_by)
		values ($1, $2, $3, $4)
		returning id
	`, importer.workspaceID, strings.TrimSpace(client.Name), client.Archived, createdBy).Scan(&insertedID)
	if err != nil {
		return 0, fmt.Errorf("insert client %q: %w", client.Name, err)
	}
	return insertedID, nil
}

func (importer *archiveImporter) insertClientWithID(
	ctx context.Context,
	clientID int64,
	name string,
	archived bool,
	createdBy *int64,
) (int64, bool, error) {
	var insertedID int64
	err := importer.tx.QueryRow(ctx, `
		insert into catalog_clients (id, workspace_id, name, archived, created_by)
		values ($1, $2, $3, $4, $5)
		on conflict do nothing
		returning id
	`, clientID, importer.workspaceID, strings.TrimSpace(name), archived, createdBy).Scan(&insertedID)
	if err == nil {
		return insertedID, true, nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	return 0, false, fmt.Errorf("insert client %d: %w", clientID, err)
}

func (importer *archiveImporter) insertScopedTag(
	ctx context.Context,
	tag importingapplication.ImportedTag,
	createdBy *int64,
) error {
	inserted, err := importer.insertTagWithID(ctx, tag.ID, tag.Name, createdBy)
	if err != nil {
		return err
	}
	if inserted {
		return nil
	}
	if _, err := importer.tx.Exec(ctx, `
		insert into catalog_tags (workspace_id, name, created_by)
		values ($1, $2, $3)
	`, importer.workspaceID, strings.TrimSpace(tag.Name), createdBy); err != nil {
		return fmt.Errorf("insert tag %q: %w", tag.Name, err)
	}
	return nil
}

func (importer *archiveImporter) insertTagWithID(
	ctx context.Context,
	tagID int64,
	name string,
	createdBy *int64,
) (bool, error) {
	tag, err := importer.tx.Exec(ctx, `
		insert into catalog_tags (id, workspace_id, name, created_by)
		values ($1, $2, $3, $4)
		on conflict do nothing
	`, tagID, importer.workspaceID, strings.TrimSpace(name), createdBy)
	if err != nil {
		return false, fmt.Errorf("insert tag %d: %w", tagID, err)
	}
	return tag.RowsAffected() > 0, nil
}

func (importer *archiveImporter) insertScopedProject(
	ctx context.Context,
	project importingapplication.ImportedProject,
	clientID *int64,
	createdBy *int64,
	color string,
	startDate *time.Time,
) (int64, error) {
	insertedID, inserted, err := importer.insertProjectWithID(ctx, project, clientID, createdBy, color, startDate)
	if err != nil {
		return 0, err
	}
	if inserted {
		return insertedID, nil
	}

	err = importer.tx.QueryRow(ctx, `
		insert into catalog_projects (
			workspace_id, client_id, name, active, pinned, actual_seconds, created_by,
			color, billable, is_private, template, recurring,
			start_date, estimated_seconds, fixed_fee, currency, rate
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		returning id
	`, importer.workspaceID, clientID, strings.TrimSpace(project.Name), project.Active, project.Pinned,
		project.ActualSeconds, createdBy, color, project.Billable, project.IsPrivate, project.Template,
		project.Recurring, startDate, project.EstimatedSeconds, project.FixedFee, project.Currency,
		project.Rate).Scan(&insertedID)
	if err != nil {
		return 0, fmt.Errorf("insert project %q: %w", project.Name, err)
	}
	return insertedID, nil
}

func (importer *archiveImporter) insertProjectWithID(
	ctx context.Context,
	project importingapplication.ImportedProject,
	clientID *int64,
	createdBy *int64,
	color string,
	startDate *time.Time,
) (int64, bool, error) {
	var insertedID int64
	err := importer.tx.QueryRow(ctx, `
		insert into catalog_projects (
			id, workspace_id, client_id, name, active, pinned, actual_seconds, created_by,
			color, billable, is_private, template, recurring,
			start_date, estimated_seconds, fixed_fee, currency, rate
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		on conflict do nothing
		returning id
	`, project.ID, importer.workspaceID, clientID, strings.TrimSpace(project.Name), project.Active,
		project.Pinned, project.ActualSeconds, createdBy, color, project.Billable, project.IsPrivate,
		project.Template, project.Recurring, startDate, project.EstimatedSeconds, project.FixedFee,
		project.Currency, project.Rate).Scan(&insertedID)
	if err == nil {
		return insertedID, true, nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	return 0, false, fmt.Errorf("insert project %d: %w", project.ID, err)
}

func importedProjectColor(project importingapplication.ImportedProject) string {
	if project.Color != nil && strings.HasPrefix(*project.Color, "#") {
		return *project.Color
	}
	return "#0b83d9"
}

func importedDatePointer(value *string) *time.Time {
	if value == nil || *value == "" {
		return nil
	}
	parsed, err := time.Parse("2006-01-02", *value)
	if err != nil {
		return nil
	}
	return &parsed
}

func (importer *archiveImporter) createdByPointer(sourceUserID int64) *int64 {
	if userID, ok := importer.userIDs.Resolve(sourceUserID); ok {
		return &userID
	}
	if importer.requestedBy <= 0 {
		return nil
	}
	return &importer.requestedBy
}

func (importer *archiveImporter) resolveImportedClientID(project importingapplication.ImportedProject) *int64 {
	if project.ClientID != nil {
		if clientID, ok := importer.clientIDs.Resolve(*project.ClientID); ok {
			return &clientID
		}
	}
	if project.CID != nil {
		if clientID, ok := importer.clientIDs.Resolve(*project.CID); ok {
			return &clientID
		}
	}
	return nil
}

func (importer *archiveImporter) findScopedObjectByID(
	ctx context.Context,
	table string,
	objectID int64,
) (int64, bool, error) {
	var existingID int64
	err := importer.tx.QueryRow(ctx, fmt.Sprintf(`
		select id
		from %s
		where workspace_id = $1 and id = $2
	`, table), importer.workspaceID, objectID).Scan(&existingID)
	switch {
	case err == nil:
		return existingID, true, nil
	case errors.Is(err, pgx.ErrNoRows):
		return 0, false, nil
	default:
		return 0, false, fmt.Errorf("lookup %s id %d: %w", table, objectID, err)
	}
}

func (importer *archiveImporter) findScopedObjectByName(
	ctx context.Context,
	table string,
	name string,
) (int64, bool, error) {
	var existingID int64
	err := importer.tx.QueryRow(ctx, fmt.Sprintf(`
		select id
		from %s
		where workspace_id = $1 and lower(name) = lower($2)
	`, table), importer.workspaceID, strings.TrimSpace(name)).Scan(&existingID)
	switch {
	case err == nil:
		return existingID, true, nil
	case errors.Is(err, pgx.ErrNoRows):
		return 0, false, nil
	default:
		return 0, false, fmt.Errorf("lookup %s name %q: %w", table, name, err)
	}
}

func (importer *archiveImporter) syncSequences(ctx context.Context) error {
	statements := []string{
		`select setval(pg_get_serial_sequence('identity_users', 'id'), coalesce((select max(id) from identity_users), 1), true)`,
		`select setval(pg_get_serial_sequence('membership_workspace_members', 'id'), coalesce((select max(id) from membership_workspace_members), 1), true)`,
		`select setval(pg_get_serial_sequence('catalog_clients', 'id'), coalesce((select max(id) from catalog_clients), 1), true)`,
		`select setval(pg_get_serial_sequence('catalog_projects', 'id'), coalesce((select max(id) from catalog_projects), 1), true)`,
		`select setval(pg_get_serial_sequence('catalog_tags', 'id'), coalesce((select max(id) from catalog_tags), 1), true)`,
	}
	for _, statement := range statements {
		if _, err := importer.tx.Exec(ctx, statement); err != nil {
			return fmt.Errorf("sync import sequences: %w", err)
		}
	}
	return nil
}

func normalizedImportedEmail(email string, userID int64) string {
	normalized := strings.ToLower(strings.TrimSpace(email))
	if normalized != "" {
		return normalized
	}
	return fmt.Sprintf("imported-user-%d@example.invalid", userID)
}

func importedWorkspaceRole(user importingapplication.ImportedWorkspaceUser) membershipdomain.WorkspaceRole {
	switch strings.ToLower(strings.TrimSpace(user.Role)) {
	case "owner":
		return membershipdomain.WorkspaceRoleOwner
	case "admin":
		return membershipdomain.WorkspaceRoleAdmin
	default:
		if user.Admin {
			return membershipdomain.WorkspaceRoleAdmin
		}
		return membershipdomain.WorkspaceRoleMember
	}
}

func importedWorkspaceState(user importingapplication.ImportedWorkspaceUser) membershipdomain.WorkspaceMemberState {
	if user.Active {
		return membershipdomain.WorkspaceMemberStateJoined
	}
	return membershipdomain.WorkspaceMemberStateDisabled
}
