-- +goose Up
alter table catalog_projects drop column actual_seconds;

-- +goose Down
alter table catalog_projects add column actual_seconds bigint not null default 0;
