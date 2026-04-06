-- +goose Up
-- Bridge v0.0.17 schema gaps not covered by 00002.

-- 1. Convert legacy 'owner' workspace role to 'admin'.
update membership_workspace_members
set role = 'admin', updated_at = now()
where role = 'owner';

alter table membership_workspace_members
    drop constraint if exists membership_workspace_members_role_check,
    add constraint membership_workspace_members_role_check
        check (role in ('admin', 'member', 'projectlead', 'teamlead'));

-- 2. Add columns introduced after v0.0.17 (no-op on fresh installs).
alter table membership_workspace_members
    add column if not exists is_direct boolean not null default true,
    add column if not exists group_ids bigint[] not null default '{}';

alter table tenant_workspaces
    add column if not exists suspended_at timestamptz,
    add column if not exists created_at timestamptz not null default now(),
    add column if not exists updated_at timestamptz not null default now();

-- +goose Down
alter table tenant_workspaces
    drop column if exists updated_at,
    drop column if exists created_at,
    drop column if exists suspended_at;

alter table membership_workspace_members
    drop column if exists group_ids,
    drop column if exists is_direct;

alter table membership_workspace_members
    drop constraint if exists membership_workspace_members_role_check,
    add constraint membership_workspace_members_role_check
        check (role in ('owner', 'admin', 'member', 'projectlead', 'teamlead'));
