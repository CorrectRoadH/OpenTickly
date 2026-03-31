import { test, expect } from "@playwright/test";

test.describe("用户旅程：新用户注册到追踪时间（中文版）", () => {
  const email = `chinese-user-${Date.now()}@example.com`;
  const password = "secret-pass";

  test("注册 → 选择中文 → 验证中文 → 切换回英文 → 验证英文", async ({ page }) => {
    // ===== 第1步：注册新账户 =====
    await page.goto("/register");
    await page.getByLabel("Full name").fill("中文用户");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Register" }).click();

    await page.waitForURL(/\/timer(?:\?.*)?$/);
    await expect(page.getByTestId("app-shell")).toBeVisible();

    // ===== 第2步：完成 onboarding（选择中文）=====
    const dialog = page.getByTestId("onboarding-dialog");

    // Wait for onboarding dialog to appear
    await expect(dialog).toBeVisible({ timeout: 10000 });
    {
      // 选择中文语言
      const languageOption = dialog.getByText("中文");
      if (await languageOption.isVisible().catch(() => false)) {
        await languageOption.click();
        await page.waitForTimeout(200);
      }

      // 按钮仍然是英文，因为 i18n 语言还未切换（onboarding 完成后才生效）
      const continueBtn = dialog.getByRole("button", { name: "Continue" });
      await continueBtn.click();
      await page.waitForTimeout(300);

      for (let i = 0; i < 3; i++) {
        const btn = dialog.getByRole("button", { name: "Continue" });
        if (await btn.isVisible().catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(300);
        } else {
          const startBtn = dialog.getByRole("button", { name: "Start tracking" });
          if (await startBtn.isVisible().catch(() => false)) {
            await startBtn.click();
            break;
          }
        }
      }
      await page.waitForTimeout(500);
    }

    // ===== 第3步：验证 Timer 页面显示中文 =====
    // onboarding 完成后保存偏好到后端，LanguageSync 切换到中文
    await expect(page.getByText("本周合计")).toBeVisible({ timeout: 10000 });

    // ===== 第4步：进入账户设置，切换回英文 =====
    await page.getByRole("button", { name: "个人资料菜单" }).click();
    await page.getByRole("menuitem", { name: "账户设置" }).click();
    await page.waitForURL(/\/account$/);

    // 语言下拉框是自定义 SelectDropdown
    await page.getByRole("button", { name: "中文" }).click();
    await page.getByRole("option", { name: "English" }).click();
    await page.waitForTimeout(500);

    // ===== 第5步：验证 UI 立即更新为英文 =====
    await expect(page.getByRole("heading", { name: "Account Settings" })).toBeVisible();

    // ===== 第6步：刷新页面，验证英文保持 =====
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForURL(/\/account$/);

    await expect(page.getByRole("heading", { name: "Personal Details" })).toBeVisible();
    await expect(page.getByRole("button", { name: "English" })).toBeVisible();

    // ===== 第7步：返回 Timer 页面，验证仍是英文 =====
    await page.goto("/timer");
    await expect(page.getByText("Week total")).toBeVisible();

    // ===== 第8步：再次切换到中文，验证切换功能正常 =====
    await page.getByRole("button", { name: "Profile menu" }).click();
    await page.getByRole("menuitem", { name: "Account settings" }).click();
    await page.waitForURL(/\/account$/);

    await page.getByRole("button", { name: "English" }).click();
    await page.getByRole("option", { name: "中文" }).click();
    await page.waitForTimeout(500);

    // 验证 UI 立即更新为中文
    await expect(page.getByRole("heading", { name: "账户设置" })).toBeVisible();

    // 刷新验证持久化
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "中文" })).toBeVisible();
  });
});
