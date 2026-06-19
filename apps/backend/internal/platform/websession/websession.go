// Package websession holds shared constants for the web UI session cookie.
package websession

// CookieName is the canonical name of the web UI session cookie. It is kept on
// the legacy "opentoggl_" prefix on purpose: renaming it would invalidate every
// existing browser session on upgrade. See BRANDING.md.
const CookieName = "opentoggl_session"
