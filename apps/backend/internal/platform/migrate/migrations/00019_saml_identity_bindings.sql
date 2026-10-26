-- +goose Up
alter table tenant_workspace_sso_config
    add column revision bigint not null default 1 check (revision > 0),
    add column identity_revision bigint not null default 1 check (identity_revision > 0);

create table identity_saml_bindings (
    workspace_id bigint not null references tenant_workspaces(id) on delete cascade,
    identity_revision bigint not null check (identity_revision > 0),
    subject_key text not null check (subject_key ~ '^[0-9a-f]{64}$'),
    user_id bigint not null references identity_users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (workspace_id, identity_revision, subject_key),
    unique (workspace_id, user_id)
);
create index identity_saml_bindings_user_idx on identity_saml_bindings(user_id);

-- +goose Down
drop table identity_saml_bindings;
alter table tenant_workspace_sso_config drop column revision, drop column identity_revision;
