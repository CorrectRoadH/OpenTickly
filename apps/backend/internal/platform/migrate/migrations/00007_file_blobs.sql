-- +goose Up
create table file_blobs (
    storage_key text primary key,
    content_type text not null,
    content bytea not null,
    created_at timestamptz not null default now()
);

-- +goose Down
drop table if exists file_blobs;
