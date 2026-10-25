import { test, expect } from "@playwright/test";
import { mockCms } from "./helpers/cms.js";
test("visitors adapt to graphics quality and can be hidden without replacing the scene", async ({
  page,
}) => {
  await mockCms(page);
  await page.goto("/");
  const canvas = page.getByTestId("store-canvas");
  await expect(canvas).toHaveAttribute("data-npc-count", "3");
  await expect(canvas).toHaveAttribute("data-npc-animated", "true");
  const original = await canvas.elementHandle();
  await page
    .getByRole("button", { name: "Store controls", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Graphics settings", exact: true })
    .click();
  await page.getByRole("button", { name: /Lightweight/ }).click();
  await expect(canvas).toHaveAttribute("data-npc-count", "2");
  await expect(canvas).toHaveAttribute("data-npc-animated", "false");
  await page
    .getByRole("button", { name: "Hide store visitors", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-npc-count", "0");
  await page
    .getByRole("button", { name: "Show store visitors", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-npc-count", "2");
  await expect(original).toBeTruthy();
  expect(await original.evaluate((el) => el.isConnected)).toBe(true);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-basket-visible", "true");
});
test("reduced motion keeps visitors still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockCms(page);
  await page.goto("/");
  await expect(page.getByTestId("store-canvas")).toHaveAttribute(
    "data-npc-count",
    "3",
  );
  await expect(page.getByTestId("store-canvas")).toHaveAttribute(
    "data-npc-animated",
    "false",
  );
});
