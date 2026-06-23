# Changelog

All notable changes to OpenTickly are documented here.

## 0.3.0

### Features

- Workspace-level SAML2 single sign-on (Toggl-compatible). Workspace admins
  configure their own identity provider under Settings → SSO, claim an email
  domain, and members log in with their work email. The login page resolves a
  typed email to the right workspace and redirects to its IdP; new users are
  provisioned just-in-time into the workspace.
- SSO configuration diagnostics: a "Test configuration" action on the settings
  page validates the setup (Site URL, email domain, certificate, IdP metadata
  reachability) before SSO is enabled.

### Changes

- Instance announcement updates now surface as a dismiss-once modal for
  warning/critical notices; informational notices stay in the admin card list.
