export type SsoResolveResult = {
  found: boolean;
  profile_name?: string;
  login_path?: string;
};

// resolveSsoProfile looks up the workspace SAML2 profile for an email so the
// dedicated SSO login screen can redirect the browser to the IdP. This is a
// public, pre-session auth bootstrap route (like the login/register pages'
// browser redirects), not part of any OpenAPI-defined web/admin/import
// contract, so this is the single sanctioned place that fetch()es it
// directly. A non-ok response is treated as "no profile found".
export async function resolveSsoProfile(email: string): Promise<SsoResolveResult> {
  const response = await fetch("/auth/sso/resolve", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    return { found: false };
  }
  return (await response.json()) as SsoResolveResult;
}
