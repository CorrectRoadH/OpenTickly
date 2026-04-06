-- +goose Up
-- Repair scheduled_reports indexes for databases that reached version 3 via
-- v0.0.17 -> v0.1.0 upgrade. Fresh installs already have these indexes.

create index if not exists scheduled_reports_workspace_id_idx on scheduled_reports (workspace_id);
create index if not exists scheduled_reports_report_id_idx on scheduled_reports (report_id);

-- +goose Down
drop index if exists scheduled_reports_report_id_idx;
drop index if exists scheduled_reports_workspace_id_idx;
