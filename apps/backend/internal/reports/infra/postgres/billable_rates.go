package postgres

import (
	"context"
	"errors"
	"fmt"

	catalog "opentoggl/backend/apps/backend/internal/catalog/application"
	tracking "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/samber/lo"
)

type BillableRateStore struct {
	pool *pgxpool.Pool
}

func NewBillableRateStore(pool *pgxpool.Pool) *BillableRateStore {
	return &BillableRateStore{pool: pool}
}

func (store *BillableRateStore) GetEntryBillableRates(
	ctx context.Context, workspaceID int64, entries []tracking.TimeEntryView,
) (map[int64]int, string, error) {
	var currency string
	err := store.pool.QueryRow(ctx, "select default_currency from tenant_workspaces where id = $1", workspaceID).Scan(&currency)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, "", nil
		}
		return nil, "", fmt.Errorf("read report currency: %w", err)
	}

	var ids, projectUserIDs []int64
	for _, entry := range entries {
		if entry.Billable {
			ids = append(ids, entry.ID)
			projectUserIDs = append(projectUserIDs, catalog.EncodeProjectUserID(lo.FromPtr(entry.ProjectID), entry.UserID))
		}
	}
	if len(ids) == 0 {
		return nil, currency, nil
	}

	// Rate amounts and the legacy workspace default use the same cent units as the rates UI.
	// An override-all rate also applies before its recorded start.
	// The workspace setting is a fallback for installations with no workspace rate history.
	rows, err := store.pool.Query(ctx, `
		with workspace as (
			select id, case when not exists (
				select 1 from catalog_rates
				where workspace_id = $1 and type = 'billable_rates' and level = 'workspace' and level_id = $1
			) then default_hourly_rate else 0 end as legacy_rate
			from tenant_workspaces where id = $1
		)
		select e.id, round(coalesce(rate.amount, w.legacy_rate))::bigint
		from unnest($2::bigint[], $3::bigint[]) input(id, project_user_id)
		join tracking_time_entries e on e.id = input.id and e.workspace_id = $1
		join workspace w on w.id = e.workspace_id
		left join membership_workspace_members m on m.workspace_id = w.id and m.user_id = e.user_id
		left join lateral (
			select r.amount
			from (values
				(1, 'task', e.task_id),
				(2, 'project_user', case when e.project_id is not null then input.project_user_id end),
				(3, 'project', e.project_id),
				(4, 'workspace_user', m.id),
				(5, 'workspace', w.id)
			) target(priority, level, id)
			join catalog_rates r on r.workspace_id = w.id and r.type = 'billable_rates'
				and r.level = target.level and r.level_id = target.id
			where (r.start_at <= e.start_time or r.rate_change_mode = 'override-all')
				and (r.end_at is null or (r.end_at > r.start_at and r.end_at > e.start_time))
			order by target.priority, r.start_at desc, r.id desc
			limit 1
		) rate on true`, workspaceID, ids, projectUserIDs)
	if err != nil {
		return nil, "", fmt.Errorf("read effective billable rates: %w", err)
	}
	defer rows.Close()

	rates := make(map[int64]int, len(ids))
	for rows.Next() {
		var id int64
		var cents int
		if err := rows.Scan(&id, &cents); err != nil {
			return nil, "", fmt.Errorf("scan effective billable rate: %w", err)
		}
		rates[id] = cents
	}
	return rates, currency, rows.Err()
}
