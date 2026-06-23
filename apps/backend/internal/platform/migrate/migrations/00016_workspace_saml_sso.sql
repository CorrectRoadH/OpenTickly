-- +goose Up

-- Replace the instance-level OIDC single sign-on with workspace-level SAML2 SSO,
-- mirroring Toggl Track: each workspace configures its own identity provider and
-- claims an email domain. The login page routes a typed email to the workspace
-- whose enabled config claims that domain.
create table tenant_workspace_sso_config (
    workspace_id     bigint primary key references tenant_workspaces(id) on delete cascade,
    enabled          boolean not null default false,
    profile_name     text not null default '',
    email_domain     text not null default '',
    idp_metadata_url text not null default '',
    idp_entity_id    text not null default '',
    idp_sso_url      text not null default '',
    idp_certificate  text not null default '',
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

-- One enabled config per claimed domain keeps email-to-workspace resolution
-- unambiguous.
create unique index tenant_workspace_sso_config_domain_key
    on tenant_workspace_sso_config (lower(email_domain))
    where enabled and email_domain <> '';

-- A single self-signed Service Provider keypair (generated lazily on first use)
-- signs AuthnRequests and metadata for every workspace; only the per-workspace
-- EntityID/ACS URL differ.
alter table instance_admin_config
    add column saml_sp_private_key text not null default '',
    add column saml_sp_certificate text not null default '';

-- Drop the now-removed instance-level OIDC columns.
alter table instance_admin_config
    drop column sso_enabled,
    drop column sso_provider_name,
    drop column sso_issuer_url,
    drop column sso_client_id,
    drop column sso_client_secret,
    drop column sso_redirect_url;

-- +goose Down

alter table instance_admin_config
    add column sso_enabled boolean not null default false,
    add column sso_provider_name text not null default '',
    add column sso_issuer_url text not null default '',
    add column sso_client_id text not null default '',
    add column sso_client_secret text not null default '',
    add column sso_redirect_url text not null default '';

alter table instance_admin_config
    drop column saml_sp_private_key,
    drop column saml_sp_certificate;

drop table tenant_workspace_sso_config;
