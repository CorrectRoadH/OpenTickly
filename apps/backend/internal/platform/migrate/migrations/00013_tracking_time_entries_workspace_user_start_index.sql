-- +goose Up
-- The dominant time-entry list/search queries filter by (workspace_id, user_id)
-- and order by start_time. A single composite index serves both the lookup and
-- the ordering, and its leading workspace_id column makes the standalone
-- workspace_id index redundant.
create index tracking_time_entries_workspace_user_start_idx
    on tracking_time_entries (workspace_id, user_id, start_time);
drop index tracking_time_entries_workspace_id_idx;

-- +goose Down
create index tracking_time_entries_workspace_id_idx on tracking_time_entries (workspace_id);
drop index tracking_time_entries_workspace_user_start_idx;
