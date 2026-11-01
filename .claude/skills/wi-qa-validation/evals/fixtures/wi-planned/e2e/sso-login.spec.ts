import { test, expect } from "@playwright/test";

test("login SSO redireciona ao Azure AD e volta logado", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar com a Microsoft" }).click();
  await expect(page).toHaveURL(/login\.microsoftonline\.com/);
});
