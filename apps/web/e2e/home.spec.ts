import { expect, test } from "@playwright/test";

test("landing page shows analyzer form", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AgentLens" })).toBeVisible();
  await expect(page.getByLabel("Website URL")).toBeVisible();
  await expect(page.getByRole("button", { name: "Analyze" })).toBeVisible();
});
