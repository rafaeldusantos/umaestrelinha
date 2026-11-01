import type { Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}
  async open() { await this.page.goto("/login"); }
}
