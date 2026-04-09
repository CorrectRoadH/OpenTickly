-- +goose Up

-- Allow 'pending_verification' as a valid user state.
alter table identity_users drop constraint identity_users_state_check;
alter table identity_users add constraint identity_users_state_check
    check (state in ('active', 'deactivated', 'deleted', 'pending_verification'));

-- Verification tokens for email confirmation during registration.
create table identity_email_verification_tokens (
    id bigserial primary key,
    user_id bigint not null unique references identity_users (id) on delete cascade,
    token text not null unique,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

-- +goose Down

drop table if exists identity_email_verification_tokens;

alter table identity_users drop constraint identity_users_state_check;
alter table identity_users add constraint identity_users_state_check
    check (state in ('active', 'deactivated', 'deleted'));
