-- +goose Up
-- Workspace-wide report/dashboard queries filter tracking_time_entries by
-- workspace_id (no user_id predicate) and order by start_time. The existing
-- (workspace_id, user_id, start_time) index cannot serve a bounded ordered
-- range scan on start_time because user_id sits between the two, forcing a
-- full workspace index scan plus an in-memory sort. A (workspace_id, start_time)
-- composite serves those queries directly.
create index if not exists tracking_time_entries_workspace_start_idx
    on tracking_time_entries (workspace_id, start_time);

-- client_id is an FK to catalog_clients with ON DELETE SET NULL but, unlike the
-- sibling project_id/task_id FKs, has no index. Deleting a client therefore
-- sequentially scans the largest table to null referencing rows.
create index if not exists tracking_time_entries_client_id_idx
    on tracking_time_entries (client_id);

-- +goose Down
drop index if exists tracking_time_entries_client_id_idx;
drop index if exists tracking_time_entries_workspace_start_idx;
