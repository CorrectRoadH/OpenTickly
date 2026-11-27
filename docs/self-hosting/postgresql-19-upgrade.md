# PostgreSQL 19 for self-hosted Docker Compose

The shipped Compose file is self-contained. PostgreSQL starts only after the
one-time `postgres-upgrade` service exits successfully. OpenTickly already
waits for PostgreSQL to become healthy. The upgrader mounts the existing
`opentoggl-postgres-data` volume at `/old` and the new
`opentoggl-postgres-data-pg19` volume at `/var/lib/postgresql`.

If the new cluster has a `PG_VERSION` file, or the old cluster has none,
the service exits without installing packages. Otherwise it checks for
1.2 times the old cluster's size in free space, installs Alpine's PostgreSQL
17 binaries, and reads the old cluster's checksum version, locale provider,
locale, and encoding. The temporary server accepts only local socket
connections and is stopped before `pg_upgrade --check` runs.

The upgrade runs as the image's `postgres` OS user and uses
`pg_upgrade --copy`. PostgreSQL can write to the old cluster while starting
and stopping it. The old cluster remains independently startable for rollback. The new
cluster is built in a staging directory on the new volume. After the copy
succeeds, the service preserves `pg_hba.conf` and `postgresql.auto.conf`. It
checks that PostgreSQL 19 can start with those files before moving the
staged cluster into the image's PGDATA path. A failure after staging
leaves files for diagnosis. A retry replaces the staging directory.

The one-time upgrade requires access to the Alpine package repositories.
Clusters with external tablespaces or WAL directories require a logical
backup and restore. See the [self-hosted upgrade guide](https://opentoggl.com/docs/backup-and-upgrade)
for operation and rollback.
