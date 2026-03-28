package postgres

import (
	"context"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"

	"github.com/jackc/pgx/v5"
)

func (store *Store) CreateRate(
	ctx context.Context,
	command catalogapplication.CreateRateCommand,
) (catalogapplication.RateView, error) {
	tx, err := store.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return catalogapplication.RateView{}, writeCatalogError("begin rate transaction", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	start := command.Start.UTC()
	if err := closeOverlappingRates(ctx, tx, command, start); err != nil {
		return catalogapplication.RateView{}, err
	}

	projectID, projectUserID, plannedTaskID, workspaceUserID := rateTargetColumns(command.Level, command.LevelID)
	row := tx.QueryRow(
		ctx,
		`insert into catalog_rates (
			workspace_id,
			type,
			level,
			level_id,
			amount,
			creator_id,
			start_at,
			end_at,
			rate_change_mode,
			project_id,
			project_user_id,
			planned_task_id,
			workspace_user_id
		)
		values ($1, $2, $3, $4, $5, $6, $7, null, $8, $9, $10, $11, $12)
		returning
			id,
			workspace_id,
			type,
			level,
			level_id,
			amount,
			creator_id,
			start_at,
			end_at,
			rate_change_mode,
			created_at,
			updated_at,
			project_id,
			project_user_id,
			planned_task_id,
			workspace_user_id`,
		command.WorkspaceID,
		command.Type,
		command.Level,
		command.LevelID,
		command.Amount,
		command.CreatorID,
		start,
		*command.Mode,
		projectID,
		projectUserID,
		plannedTaskID,
		workspaceUserID,
	)

	rate, err := scanRate(row)
	if err != nil {
		return catalogapplication.RateView{}, writeCatalogError("insert catalog rate", err)
	}

	if err := syncCurrentRateValue(ctx, tx, rate); err != nil {
		return catalogapplication.RateView{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return catalogapplication.RateView{}, writeCatalogError("commit catalog rate", err)
	}
	return rate, nil
}

func (store *Store) ListRatesByLevel(
	ctx context.Context,
	workspaceID int64,
	level catalogapplication.RateLevel,
	levelID int64,
	rateType catalogapplication.RateType,
) ([]catalogapplication.RateView, error) {
	rows, err := store.pool.Query(
		ctx,
		`select
			id,
			workspace_id,
			type,
			level,
			level_id,
			amount,
			creator_id,
			start_at,
			end_at,
			rate_change_mode,
			created_at,
			updated_at,
			project_id,
			project_user_id,
			planned_task_id,
			workspace_user_id
		from catalog_rates
		where workspace_id = $1 and level = $2 and level_id = $3 and type = $4
		order by start_at desc, id desc`,
		workspaceID,
		level,
		levelID,
		rateType,
	)
	if err != nil {
		return nil, writeCatalogError("list catalog rates", err)
	}
	defer rows.Close()

	rates := make([]catalogapplication.RateView, 0)
	for rows.Next() {
		rate, scanErr := scanRate(rows)
		if scanErr != nil {
			return nil, writeCatalogError("scan catalog rate", scanErr)
		}
		rates = append(rates, rate)
	}
	return rates, rows.Err()
}

func closeOverlappingRates(
	ctx context.Context,
	tx pgx.Tx,
	command catalogapplication.CreateRateCommand,
	start time.Time,
) error {
	query := `
		update catalog_rates
		set
			end_at = case
				when start_at > $5 then start_at
				else $5
			end,
			updated_at = now()
		where
			workspace_id = $1
			and level = $2
			and level_id = $3
			and type = $4
			and coalesce(end_at, 'infinity'::timestamptz) > $5
	`
	args := []any{
		command.WorkspaceID,
		command.Level,
		command.LevelID,
		command.Type,
		start,
	}
	if *command.Mode != catalogapplication.RateChangeModeOverrideAll {
		query += " and start_at < $5"
	}
	if _, err := tx.Exec(ctx, query, args...); err != nil {
		return writeCatalogError("close overlapping catalog rates", err)
	}
	return nil
}

// syncCurrentRateValue writes the current rate amount back to the target entity
// (workspace default_hourly_rate or member hourly_rate/labor_cost).
// TODO: This crosses domain boundaries by writing to tenant_workspaces and
// membership_workspace_members from the catalog store. Move to an application-layer
// event/hook when the app has event infrastructure.
func syncCurrentRateValue(ctx context.Context, tx pgx.Tx, rate catalogapplication.RateView) error {
	if rate.Start.After(time.Now().UTC()) {
		return nil
	}

	switch rate.Level {
	case catalogapplication.RateLevelWorkspace:
		if rate.Type != catalogapplication.RateTypeBillable {
			return nil
		}
		if _, err := tx.Exec(
			ctx,
			`update tenant_workspaces
			set default_hourly_rate = $2
			where id = $1`,
			rate.WorkspaceID,
			rate.Amount,
		); err != nil {
			return writeCatalogError("sync workspace default hourly rate", err)
		}
	case catalogapplication.RateLevelWorkspaceUser:
		if rate.WorkspaceUserID == nil {
			return nil
		}
		column := "hourly_rate"
		if rate.Type == catalogapplication.RateTypeLaborCost {
			column = "labor_cost"
		}
		if _, err := tx.Exec(
			ctx,
			`update membership_workspace_members
			set `+column+` = $3
			where workspace_id = $1 and id = $2`,
			rate.WorkspaceID,
			*rate.WorkspaceUserID,
			rate.Amount,
		); err != nil {
			return writeCatalogError("sync workspace member rate", err)
		}
	}
	return nil
}

func rateTargetColumns(
	level catalogapplication.RateLevel,
	levelID int64,
) (projectID *int64, projectUserID *int64, plannedTaskID *int64, workspaceUserID *int64) {
	switch level {
	case catalogapplication.RateLevelProject:
		projectID = &levelID
	case catalogapplication.RateLevelProjectUser:
		projectUserID = &levelID
	case catalogapplication.RateLevelTask:
		plannedTaskID = &levelID
	case catalogapplication.RateLevelWorkspaceUser:
		workspaceUserID = &levelID
	}
	return projectID, projectUserID, plannedTaskID, workspaceUserID
}
