-- +goose Up

-- Instance-level OpenID Connect single sign-on is configured at runtime through
-- the admin settings UI, so its settings live alongside the other singleton
-- instance config (site URL, SMTP) rather than in environment variables.
alter table instance_admin_config
    add column sso_enabled boolean not null default false,
    add column sso_provider_name text not null default '',
    add column sso_issuer_url text not null default '',
    add column sso_client_id text not null default '',
    add column sso_client_secret text not null default '',
    add column sso_redirect_url text not null default '';

-- +goose Down

alter table instance_admin_config
    drop column sso_enabled,
    drop column sso_provider_name,
    drop column sso_issuer_url,
    drop column sso_client_id,
    drop column sso_client_secret,
    drop column sso_redirect_url;
