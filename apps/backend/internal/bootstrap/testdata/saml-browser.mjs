import { chromium, expect } from "@playwright/test";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const config = JSON.parse(input);
const browser = await chromium.launch({
  executablePath: process.env.E2E_CHROMIUM_EXECUTABLE_PATH || undefined,
});
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const login = `${config.base}/auth/saml2/login/${config.workspace}`;
  await page.goto(login);
  await expect(page).toHaveURL(`${config.base}/login?sso_error=account_exists`);
  await context.addCookies([
    {
      name: "opentoggl_session",
      value: config.session,
      url: config.base,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto(`${config.base}/saml-test-ready`);
  await expect(page.getByTestId("saml-test-ready")).toBeVisible();
  const target = await page.evaluate(async (workspace) => {
    const response = await fetch(`/web/v1/workspaces/${workspace}/sso-identity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok) throw new Error(`link start ${response.status}`);
    return (await response.json()).authorization_url;
  }, config.workspace);
  await page.goto(target);
  await expect(page).toHaveURL(`${config.base}/profile?sso_linked=1`);
  await context.clearCookies();
  await page.goto(login);
  await expect(page).toHaveURL(`${config.base}/`);
  await expect
    .poll(async () => (await context.cookies()).some((c) => c.name === "opentoggl_session"))
    .toBe(true);
  await page.goto(`${config.base}/saml-test-ready`);
  await expect(page.getByTestId("saml-test-ready")).toBeVisible();
  const status = await page.evaluate(
    async (workspace) =>
      (
        await fetch(`/web/v1/workspaces/${workspace}/sso-identity`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: "secret1" }),
        })
      ).status,
    config.workspace,
  );
  expect(status).toBe(204);
  console.log("Cross-site SAML POST: collision rejection, explicit link, login and unlink passed.");
} finally {
  await browser.close();
}
