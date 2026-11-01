import { test, expect } from "@playwright/test";

test("mostra o botão de SSO", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Entrar com a Microsoft" })).toBeVisible();
});
