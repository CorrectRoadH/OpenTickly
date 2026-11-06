-- +goose Up

-- Instance-level OpenID Connect single sign-on, configured at runtime by the
-- instance administrator. Complements (does not replace) workspace SAML.
create table instance_admin_oidc_config (
    id integer primary key default 1,
    enabled boolean not null default false,
    provider_name text not null default '',
    issuer_url text not null default '',
    client_id text not null default '',
    client_secret text not null default '',
    allowed_email_domains text[] not null default '{}',
    auto_provision boolean not null default false,
    revision bigint not null default 1 check (revision > 0),
    updated_at timestamptz not null default now(),
    constraint instance_admin_oidc_config_singleton check (id = 1)
);

create table identity_oidc_bindings (
    issuer text not null,
    subject text not null,
    user_id bigint not null references identity_users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (issuer, subject),
    unique (user_id)
);

-- +goose Down
drop table identity_oidc_bindings;
drop table instance_admin_oidc_config;
