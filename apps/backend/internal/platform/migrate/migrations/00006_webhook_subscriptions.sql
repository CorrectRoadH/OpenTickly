-- +goose Up

create table webhook_subscriptions (
    id bigserial primary key,
    workspace_id bigint not null,
    user_id bigint not null references identity_users (id) on delete cascade,
    description text not null,
    url_callback text not null,
    secret text not null,
    enabled boolean not null default false,
    validation_code text not null default '',
    validated_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create unique index webhook_subscriptions_description_workspace_unique
    on webhook_subscriptions (workspace_id, description) where (deleted_at is null);

create index webhook_subscriptions_workspace_id_idx
    on webhook_subscriptions (workspace_id) where (deleted_at is null);

create table webhook_subscription_event_filters (
    id bigserial primary key,
    subscription_id bigint not null references webhook_subscriptions (id) on delete cascade,
    entity text not null,
    action text not null,
    constraint webhook_subscription_event_filters_unique
        unique (subscription_id, entity, action)
);

create index webhook_subscription_event_filters_subscription_id_idx
    on webhook_subscription_event_filters (subscription_id);

-- +goose Down

drop table if exists webhook_subscription_event_filters;
drop table if exists webhook_subscriptions;
