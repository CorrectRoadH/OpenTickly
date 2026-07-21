-- +goose Up
-- Each of these standalone single-column indexes is a strict leading-column
-- prefix of an existing UNIQUE composite on the same table, so the composite
-- already serves both equality lookups (col = $1) and FK-cascade scans on that
-- column. The standalone indexes only add write/maintenance amplification on
-- the catalog write/import paths. (Same optimization migration 00013 applied to
-- tracking_time_entries_workspace_id_idx.)
drop index if exists catalog_clients_workspace_id_idx;              -- prefix of catalog_clients_workspace_name_key (workspace_id, lower(name))
drop index if exists catalog_projects_workspace_id_idx;            -- prefix of catalog_projects_workspace_name_key (workspace_id, lower(name))
drop index if exists catalog_tags_workspace_id_idx;               -- prefix of catalog_tags_workspace_name_key (workspace_id, lower(name))
drop index if exists catalog_tasks_workspace_id_idx;              -- prefix of catalog_tasks_workspace_name_key (workspace_id, lower(name))
drop index if exists catalog_groups_organization_id_idx;          -- prefix of catalog_groups_organization_name_key (organization_id, lower(name))
drop index if exists membership_workspace_members_workspace_id_idx; -- prefix of membership_workspace_members_workspace_user_key (workspace_id, user_id)

-- +goose Down
create index if not exists catalog_clients_workspace_id_idx on catalog_clients (workspace_id);
create index if not exists catalog_projects_workspace_id_idx on catalog_projects (workspace_id);
create index if not exists catalog_tags_workspace_id_idx on catalog_tags (workspace_id);
create index if not exists catalog_tasks_workspace_id_idx on catalog_tasks (workspace_id);
create index if not exists catalog_groups_organization_id_idx on catalog_groups (organization_id);
create index if not exists membership_workspace_members_workspace_id_idx on membership_workspace_members (workspace_id);
