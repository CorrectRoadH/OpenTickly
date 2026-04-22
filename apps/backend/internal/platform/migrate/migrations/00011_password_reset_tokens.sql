-- +goose Up

create table identity_password_reset_tokens (
    id bigserial primary key,
    user_id bigint not null references identity_users (id) on delete cascade,
    token_hash text not null unique,
    expires_at timestamptz not null,
    created_at timestamptz not null default now(),
    consumed_at timestamptz
);

create index identity_password_reset_tokens_user_id_idx on identity_password_reset_tokens (user_id);

-- +goose Down

drop table if exists identity_password_reset_tokens;
