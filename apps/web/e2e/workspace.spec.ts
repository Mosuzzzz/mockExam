import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const reviewDir = resolve(process.cwd(), ".impeccable/review");

async function openWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your practice workspace" })).toBeVisible();
  await expect(page.getByText("Your first test is one import away.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Import your first test" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => true));
}

test("local workspace shows the empty state and import action", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openWorkspace(page);
  await mkdir(reviewDir, { recursive: true });
  await page.screenshot({ path: resolve(reviewDir, "desktop.png"), fullPage: true, animations: "disabled" });
});

test("local workspace fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  await mkdir(reviewDir, { recursive: true });
  await page.screenshot({ path: resolve(reviewDir, "mobile.png"), fullPage: true, animations: "disabled" });

  await page.setViewportSize({ width: 360, height: 800 });
  const minimumWidth = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(minimumWidth.documentWidth).toBeLessThanOrEqual(minimumWidth.viewportWidth);
  await expect(page.getByRole("link", { name: "Import your first test" })).toBeVisible();
});
