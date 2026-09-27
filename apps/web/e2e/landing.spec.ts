import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const reviewDir = resolve(process.cwd(), ".impeccable/review");

async function openLanding(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Bring your questions/ })).toBeVisible();
  await expect(page.locator(".landing-sign-in")).toHaveAttribute("href", "#sign-in");
  await expect(page.getByText("Sign in to save tests, track attempts, and return whenever you’re ready.")).toBeVisible();
  await expect(page.getByText("SAMPLE EXAM · DATABASE MIDTERM")).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /GitHub/i })).toBeVisible();
  await expect(page.getByText("Sign up", { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => true));
}

test("signed-out landing page presents the exam flow and authentication choices", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openLanding(page);
  await mkdir(reviewDir, { recursive: true });
  await page.screenshot({ path: resolve(reviewDir, "desktop.png"), fullPage: true, animations: "disabled" });
  await page.locator(".landing-sign-in").click();
  await expect(page).toHaveURL(/#sign-in$/);
});

test("signed-out landing page fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLanding(page);
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
  await expect(page.locator(".landing-sign-in")).toBeVisible();
});
