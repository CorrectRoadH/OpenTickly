// Package platform is the dependency-free infrastructure kernel: shared
// handles (database, redis, jobs, email, webhooks), config loading, SSRF-safe
// HTTP, schema migration, and web session handling. Every backend module may
// depend on platform without teaching apps/backend about concrete
// infrastructure details.
//
// platform intentionally owns no transport layer and no feature behavior: it
// must never import another internal module (identity, tenant, etc.).
// Feature code that used to live here (avatar/logo file storage, reference
// data such as countries/currencies/timezones) has moved to its own
// top-level module — see internal/files and internal/reference.
package platform
