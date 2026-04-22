-- +goose Up

alter table membership_workspace_members
    add column invite_token text,
    add column invite_token_expires_at timestamptz;

create unique index membership_workspace_members_invite_token_key
    on membership_workspace_members (invite_token)
    where invite_token is not null;

-- +goose Down

drop index if exists membership_workspace_members_invite_token_key;
alter table membership_workspace_members
    drop column if exists invite_token_expires_at,
    drop column if exists invite_token;
