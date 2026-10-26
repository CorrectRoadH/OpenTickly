# Workspace SAML identity and callback security

## Contract and trust boundary

OpenTickly keeps workspace-scoped SAML 2.0 SSO. SAML and OIDC are different
federation protocols; neither makes an incorrectly scoped identity provider safe.
Workspace administrators may configure their workspace's IdP, but cannot use an
email assertion to authenticate an arbitrary global OpenTickly account.

An email domain is a login-discovery hint and a provisioning filter, not proof
that the workspace owns that domain. An existing local account must explicitly
bind its SAML identity while authenticated. There is no email-based automatic
linking, including pending-verification accounts. New users can be provisioned
only when registration is open and local email verification is not required;
otherwise they must complete ordinary registration before linking. This avoids
treating an arbitrary workspace IdP as an email-verification authority.

The identity key is workspace ID, provider identity revision, and SHA-256 of a
canonical JSON tuple of assertion issuer and NameID (format, name qualifier,
SP name qualifier, value). Missing/empty NameID or issuer is rejected. Email is
not an identity key. NameID must be stable; transient NameID is rejected. The
existing email NameID request remains supported, but the returned NameID and
issuer, rather than an email attribute, select the binding.

## Persistent model and configuration

Add migration 00019 and update the current schema snapshot. Add positive bigint
`revision` and `identity_revision` to `tenant_workspace_sso_config`, both default
1. Every saved change increments revision. Changes to email domain, metadata
URL, IdP entity ID, SSO URL, or signing certificate also increment identity
revision and delete that workspace's bindings in the same transaction. Profile
name and enabled changes do not remove bindings, but invalidate in-flight flows.
This prevents a workspace admin from substituting an IdP and inheriting existing
users' consent. Metadata signing-key rotation at an unchanged trusted metadata
URL remains within the authority the user consented to.

`identity_saml_bindings` contains `workspace_id bigint` (FK workspace cascade),
`identity_revision bigint`, `subject_key text` (64 lowercase hex characters),
`user_id bigint` (FK identity_users cascade), and `created_at timestamptz`.
Primary key is `(workspace_id, identity_revision, subject_key)`; unique
`(workspace_id,user_id)` gives one active identity per user per workspace. That
unique index also serves per-user/workspace status queries; add an index on
`user_id` for global user deletion and listing. No raw assertions or IdP tokens
are persisted. Existing accounts are not guessed into bindings: after upgrade
they first use local login or password reset, then explicitly bind. This is an
intentional security migration; old SSO accounts already have random passwords
and can use the existing email password-reset flow.

Add `revision` to our configuration read/update API (required optimistic
precondition; zero denotes a draft with no saved row, stale writes return 409). Changes to the trust inputs warn that
users must link again. Keep upstream Toggl specifications untouched.

## Account operations and transaction boundaries

Add authenticated current-workspace endpoints under
`/web/v1/workspaces/{workspace_id}/sso-identity`: GET returns enabled, profile
name and linked; POST starts linking and returns an authorization URL; DELETE
accepts the current local password and unlinks. POST requires active membership
in the current workspace, checked both at start and completion, but not admin
status. GET/DELETE of one's own binding do not require current-workspace or
membership status; a removed member retains the right to revoke IdP authority.
An authenticated `/web/v1/me/sso-identities` list makes these bindings discoverable
after membership removal. Linking records original user
and session IDs in the server-side flow, rechecks that session and active user
at completion, and never changes an email, password, API token, or role.
Unlink requires successful local-password verification and revokes every local
session for the user. Users with an unknown random SSO password must set a known
password via the existing password-reset flow before unlinking.

The identity application owns SAML login/link/unlink behavior, with typed
repository ports. The PostgreSQL adapter commits each identity mutation and
session issuance atomically, rechecking the active user and original link
session under row locks. A new user, binding, and session are committed together;
email collision rolls back and returns `account_exists`. Existing bindings
select user ID without consulting or modifying email. Registration policy and
email-verification policy are checked for provisioning, including at the final
transaction boundary. Pending, deactivated and deleted users cannot log in.

The identity PostgreSQL SAML repository is the sole transaction owner. Its typed
`Login`, `Link`, and `Unlink` operations receive workspace/config/identity revision,
subject key and the relevant user/session credentials; `Login` also receives an
optional newly constructed domain User and a fresh local session ID. These
operations begin one pgx transaction and run every configuration/policy check,
user/session lock, binding write and session write on that transaction. Existing
user/session SQL adapters accept a narrow internal query interface so that the
SAML adapter reuses them with pgx.Tx; it never calls pool-backed repositories
inside the transaction. Bootstrap does protocol verification before calling the
application service and does not own a second transaction. The adapter's
read access to instance policy, workspace SSO config and membership is explicit
cross-module authorization validation, not permission to mutate those domains.
Order locks: instance registration
policy/config (only when provisioning), workspace SSO config, user, session,
binding. Configuration changes lock SSO config before deleting bindings.
Workspace membership/home assignment continues through existing services;
on assignment failure revoke the newly issued session before returning failure.
SP keypair initialization uses a row lock and returns the single committed pair.
Session authorization always reads PostgreSQL, ignoring legacy Redis session
cache entries; unrelated caches remain. Provisioning reads the raw locked
email_verification_required flag and registration mode, failing closed on errors,
without the existing SMTP-dependent verification helper.

## Browser flow and one-time state

Each login/link/test start generates a 256-bit random browser secret. Set it in
an HttpOnly, Secure, SameSite=None cookie scoped to `/auth/saml2/`, valid for ten
minutes. SAML POST binding requires this cross-site cookie. SAML requires a
configured HTTPS Site URL (loopback HTTP may be supported only if real browser
tests prove the Secure cookie round-trip; otherwise fail clearly, never weaken
the cookie). The session cookie retains its existing policy. A second start
replaces the browser secret, invalidating the previous browser flow.

Redis state, keyed by AuthnRequest ID, carries workspace ID, config revision,
browser-secret hash, purpose (`login`, `link`, `test`), and original user/session
for link/test. TTL is ten minutes. ACS accepts one RelayState and SAMLResponse,
bounded request size, requires the browser cookie, and consumes state with
atomic Redis GETDEL. Missing/mismatched browser, expired/replayed state, Redis
errors and config changes all fail closed. A mismatched/old flow does not clear
the cookie of a newer flow. Reject SAMLart in both query and body before invoking
the library; only POST SAMLResponse binding is supported, with no artifact
network requests. Require audience restrictions and a valid bearer subject
confirmation in addition to validating signature, destination,
audience, issuer, lifetime and InResponseTo through crewjam; no unsolicited IdP
initiated assertions. Clear the flow cookie on completion. Test flows cannot
create sessions; their admin session and workspace-admin membership must still
be valid, but saved disabled configurations remain testable. Result postMessage
targets the configured origin, never `*`.

Session-bearing legitimate SAML cross-origin POSTs need a narrow ACS exception
from the generic cookie-origin middleware; the exception is protected by the
flow binding, not by broadly disabling origin checks. Start/link endpoints use
same-origin POST/JSON for authenticated mutations. No arbitrary return URLs.
Fixed user-facing error codes replace provider exception or assertion output
in login errors. Apply no-store and no-referrer to auth responses.

## Outbound metadata boundary

Metadata fetching reuses platform/safehttp, with SAML-specific validation and
body limits: HTTPS only, no userinfo or
fragment, port 443 only, no proxy environment, no redirects, ten-second total
deadline and one-MiB body limit. Resolve hostnames once per connection, reject
all loopback/private/link-local/unspecified/multicast/reserved targets, and dial
the vetted IP directly while retaining hostname TLS verification. Reject a
hostname if any returned IP is disallowed, preventing DNS rebinding and mixed
answers. The same client serves saved and draft diagnostics; no default-client
fallback. Manual certificate configuration supports private IdPs without making
server-side requests to them, while sign-in endpoints still require HTTPS.
Cache built metadata for at most five minutes and include the SP key identity in
the fingerprint. Tests may inject resolver/dial boundaries, never bypass the
production URL/address policy.

## Acceptance and rollout

Red/green tests must cover a malicious workspace IdP asserting an existing
global account email, explicit linking, provider change invalidation, new-user
registration policy, revoked link session, concurrent binding/provisioning,
wrong browser, missing state, duplicate parameters, replay and concurrent
replay, Redis failure, wrong signature/audience/issuer/InResponseTo, and private
or redirected metadata URLs. Exercise a real signed SAML response through the
HTTP entrypoints and PostgreSQL/Redis, with fake only at the IdP/network boundary.
Real browser coverage includes cross-site POST cookie round-trip, settings
revision handling, local-login linking, subsequent SSO login and unlinking.

Existing configuration remains visible after migration. Users must link through
local authentication before old identities can log in; do not infer mappings by
email. HTTPS Site URL and reachable public HTTPS metadata (or manual IdP config)
are deployment prerequisites. Deploy all replicas together: old binaries retain
the email-merge vulnerability and must not coexist. Rollback restores that risk;
disable SSO before rolling back. No production deployment is part of this task.

## Independent review

Native Codex / GPT-6.1 Sol reviewed the proposal through Herdr. The four blocking
findings are addressed above: authoritative session reads, owner-controlled
unlink after membership removal, rejecting the SAMLart outbound bypass, and one
explicit transaction owner. Also accepted: raw fail-closed provisioning policy,
required audience/subject confirmation, preserving newer flow cookies, and
testing saved disabled providers. Login discovery must show the workspace and
IdP destination before navigation and retain local login. It is a hint, not
verified domain ownership. Before deployment, exercise local-password recovery
with configured SMTP for old SSO-only users. Implementation remains limited to
these security boundaries; validation is targeted, not a full long E2E sweep.
