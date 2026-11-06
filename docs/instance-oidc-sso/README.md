# Instance-level OpenID Connect single sign-on

## Scope and trust boundary

The instance administrator may configure one OpenID Connect provider for the
whole instance (for example Google, Authentik, Keycloak). This is distinct from
workspace-scoped SAML (`docs/sso-security`): a workspace admin is not trusted to
authenticate arbitrary accounts, but the instance admin already owns every
account on the instance, so an instance-level provider is an authority the
operator chose for everyone.

Consequences of that trust boundary:

- The identity key is `(issuer, sub)`. Email is never the key for an existing
  binding.
- A verified email (`email_verified = true`) **may** link the identity to an
  existing local account with the same address. This is the one place where
  email-based linking is allowed, because the instance admin vouched for the
  provider. Unverified emails never link or provision.
- New accounts are created only when `auto_provision` is on. Provisioning
  bypasses the registration policy: the provider, not an open signup form, is
  the gate. Provisioned users get a random local password and can set a known
  one through the password-reset flow.
- `allowed_email_domains` (optional) restricts linking and provisioning to those
  domains. An empty list allows any verified email.
- Configuration lives in the database (`instance_admin_oidc_config`), edited at
  runtime through the admin API, never through environment variables.

## Persistent model

- `instance_admin_oidc_config` is a singleton row: `enabled`, `provider_name`,
  `issuer_url`, `client_id`, `client_secret`, `allowed_email_domains text[]`,
  `auto_provision`, `revision`, `updated_at`. Every saved change increments
  `revision`; a save whose `revision` does not match the stored one is rejected
  with 409. Changing `issuer_url` or `client_id` deletes every OIDC binding in
  the same transaction, because subjects are only meaningful per client.
- `identity_oidc_bindings`: `issuer`, `subject`, `user_id`, `created_at`.
  Primary key `(issuer, subject)`, unique `user_id` (one instance identity per
  user). No ID tokens, access tokens or refresh tokens are persisted.

## Admin API

- `GET /admin/v1/sso/oidc` returns the config, with `client_secret_configured`
  instead of the secret, plus the derived `redirect_url`
  (`{site_url}/auth/oidc/callback`) and `login_url` (`/auth/oidc/login`) the
  admin pastes into the provider.
- `PUT /admin/v1/sso/oidc` takes `revision`, `enabled`, `provider_name`,
  `issuer_url`, `client_id`, optional `client_secret` (omitted or empty keeps the
  stored one), `allowed_email_domains`, `auto_provision`. Enabling requires an
  HTTPS issuer, a client ID, a stored secret and an HTTPS Site URL (the Secure
  browser cookie and the provider redirect both need HTTPS); otherwise 400.
- `POST /admin/v1/sso/oidc/test` runs provider discovery for the issuer in the
  request body and reports the endpoints found, so the admin can validate the
  issuer before enabling.

Admin routes keep the existing instance-admin middleware (instance admin
session required).

## Browser flow

- `GET /web/v1/auth/sso-providers` is public and tells the login page whether
  instance OIDC is enabled, the display name and the login path.
- `GET /auth/oidc/login` starts an authorization-code flow with PKCE (S256) and a
  nonce. State is a 256-bit random ID stored in Redis for ten minutes with the
  nonce, PKCE verifier, config revision and a hash of a browser secret that is
  set as an HttpOnly, Secure, SameSite=Lax cookie scoped to `/auth/oidc/`.
- `GET /auth/oidc/callback` requires the cookie, consumes the state atomically
  (GETDEL), exchanges the code, verifies the ID token signature, audience,
  expiry and nonce through the discovered JWKS, then calls the identity service.
  Any failure redirects to `/login?sso_error=<code>`; codes are
  `invalid_callback`, `configuration_changed`, `verification_failed`,
  `account_not_found`, `email_not_allowed`, `email_unverified`,
  `identity_taken`, `unavailable`.
- Success issues a normal session cookie and redirects to `/`. The session shell
  creates the default organization and workspace for provisioned users exactly
  as it does for a locally registered user.

## Transaction boundary

The identity PostgreSQL OIDC repository owns one transaction per login: lock the
OIDC config row (`FOR SHARE`, must still be enabled with the same issuer), look
up the binding, otherwise lock the email-matched user or insert the new user,
insert the binding, lock and validate the user (`CanAuthenticate`), write the
session. Email collisions and binding collisions roll back and map to
`identity_taken`.
