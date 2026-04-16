-- +goose Up

-- Singleton row carrying this self-hosted instance's stable identity. Used by
-- the telemetry pinger to report anonymous daily check-ins to the upstream
-- update service, and by the admin instance-version endpoint.
--
-- The `id` CHECK constraint makes the table a singleton: only id=1 is legal,
-- so concurrent inserts can't create a second identity row.
create table instance_identity (
    id smallint primary key default 1 check (id = 1),
    instance_id uuid not null default gen_random_uuid(),
    first_seen_at timestamptz not null default now()
);

insert into instance_identity (id) values (1) on conflict (id) do nothing;

-- +goose Down

drop table if exists instance_identity;
