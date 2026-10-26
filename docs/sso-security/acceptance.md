# SAML security acceptance — 2026-10-26

Implemented the [reviewed contract](README.md). Existing local accounts require
explicit SAML binding; provider replacement invalidates consent, and callbacks
require one-time browser-bound state. Migration 00019 does not infer bindings
from historical emails. No production deployment was performed.

## Evidence

- Before implementation, the existing-email regression authenticated the victim
  account and the metadata regression reached a private HTTP server. The new
  harness rule also reported the old email-lookup, non-atomic state deletion and
  default metadata client patterns. These cases now reject the unsafe behavior.
- `vp run check`: passed all 12 tasks. Existing warnings remain in the landing
  route and calendar callbacks. `vp run website#build`: passed, with existing
  bundle-size/build-timing notices.
- `vp run test:unit apps/website/src/features/auth/AuthFeature.test.tsx`: 3 passed.
- Targeted Go tests passed in bootstrap, identity/application, identity/saml,
  platform/safehttp and HTTP. PostgreSQL migrations ran through the actual
  application startup against disposable schemas; Redis used an isolated daemon.
  Coverage includes existing-email rejection, explicit binding, original-session
  validation, removed-member unlink, all-session revocation, closed registration,
  required email verification, concurrent provisioning, stale configuration and
  consent invalidation, wrong browser, malformed/duplicate/artifact parameters,
  Redis failure, replay and concurrent replay, untrusted signing key, issuer,
  audience, InResponseTo and transient NameID rejection, and private metadata.
- `TestSAMLBrowserCookieRoundTrip` passed with real Chromium, TLS, PostgreSQL,
  Redis and signed IdP responses. Application `127.0.0.1` and IdP `localhost`
  exercise cross-site POST: an existing-email assertion is rejected, explicit
  linking succeeds, subsequent login succeeds, and unlink succeeds.
- A Vite/Chromium UI smoke check verified that SSO discovery displays the
  workspace/provider/destination and waits for confirmation. Screenshot inspected.
  This UI check mocks discovery/session API responses; it is not a live-IdP UI
  acceptance claim. Configuration revisions were checked through the real API.
- `harness-lint check --changed` and the new rule over `--all`: no diagnostics.
  `git diff --check`: passed.

## Reproduction and scope

Set `DATABASE_URL` to an isolated PostgreSQL database and `SAML_TEST_REDIS_URL`
to an isolated Redis instance. Run:

```sh
SAML_TEST_BROWSER=1 go test ./apps/backend/internal/bootstrap \
  ./apps/backend/internal/identity/application ./apps/backend/internal/identity/saml \
  ./apps/backend/internal/platform/safehttp ./apps/backend/internal/http \
  -run 'TestSAML|TestSSO|TestUpdateWorkspaceSsoConfig|TestMetadata|Test.*Origin|Test.*Safe|Test.*Forbidden' -count=1
go test ./apps/backend/internal/identity/saml ./apps/backend/internal/platform/safehttp -count=1
```

`E2E_CHROMIUM_EXECUTABLE_PATH` can select a system Chromium. On this NixOS host,
backend startup expects `/usr/share/zoneinfo`; a temporary bubblewrap mount of
`/etc/zoneinfo` supplied that path without changing the host or application.

The initial static check used stale node_modules. `vp install --frozen-lockfile`
restored the committed dependency set and resolved both errors. The current API
generator requires the TypeScript compiler API removed by installed TypeScript 7;
generation used a temporary TypeScript 5.9.3 import hook, without dependency or
lockfile changes. Generated code passes the project checks and website build.

Per the requested bounded scope, no full long-running E2E sweep or production
IdP/SMTP acceptance was performed. Before deployment, verify local password
recovery for existing SSO-only accounts, configure an HTTPS Site URL, and update
all replicas together. Existing SSO users must sign in locally and link again.
