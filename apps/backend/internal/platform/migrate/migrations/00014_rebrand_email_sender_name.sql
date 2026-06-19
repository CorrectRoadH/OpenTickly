-- +goose Up
-- The instance email "From" name shipped with the old brand default 'OpenToggl'.
-- Move the column default to the new brand, and update the singleton config row
-- only where it still holds the old default so admins who customized their
-- sender name are left untouched.
alter table instance_admin_config alter column sender_name set default 'OpenTickly';
update instance_admin_config set sender_name = 'OpenTickly' where sender_name = 'OpenToggl';

-- +goose Down
alter table instance_admin_config alter column sender_name set default 'OpenToggl';
update instance_admin_config set sender_name = 'OpenToggl' where sender_name = 'OpenTickly';
