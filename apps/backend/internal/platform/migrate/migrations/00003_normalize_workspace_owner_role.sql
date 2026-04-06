-- +goose Up
-- v0.0.17 used role='owner' for workspace owners. Main uses 'admin'.
-- Convert legacy 'owner' rows and tighten the CHECK constraint.

update membership_workspace_members
set role = 'admin', updated_at = now()
where role = 'owner';

alter table membership_workspace_members
    drop constraint if exists membership_workspace_members_role_check,
    add constraint membership_workspace_members_role_check
        check (role in ('admin', 'member', 'projectlead', 'teamlead'));

-- +goose Down
alter table membership_workspace_members
    drop constraint if exists membership_workspace_members_role_check,
    add constraint membership_workspace_members_role_check
        check (role in ('owner', 'admin', 'member', 'projectlead', 'teamlead'));
