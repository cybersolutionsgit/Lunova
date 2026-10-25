import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { mockCms } from "./helpers/cms.js";
const id = "d81314a29e3943d88a6ee1426021a177";
test("the selected jeans model walks locally, switches to the lightweight variant and exposes its credits", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      /Content Security Policy|load texture/.test(m.text())
    )
      errors.push(m.text());
  });
  const productionConnect = readFileSync("public/_headers", "utf8").match(
    /connect-src[^;]+/,
  )[0];
  await page.route("http://127.0.0.1:5173/", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        // Only Vite's dev socket is added; model-resource policy is unchanged.
        "Content-Security-Policy":
          productionConnect + " ws://localhost:5173 ws://127.0.0.1:5173",
      },
    });
  });
  await mockCms(page);
  await page.goto("/");
  const canvas = page.getByTestId("store-canvas");
  await expect(canvas).toHaveAttribute("data-npc-rose-model", "loaded", {
    timeout: 30000,
  });
  await expect(canvas).toHaveAttribute("data-npc-model-id", id);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-npc-walk-weight")))
    .toBeGreaterThan(0.5);
  const first = JSON.parse(await canvas.getAttribute("data-npc-shopper-pose"));
  await expect
    .poll(
      async () =>
        Math.abs(
          JSON.parse(await canvas.getAttribute("data-npc-shopper-pose")).z -
            first.z,
        ),
      { timeout: 10000 },
    )
    .toBeGreaterThan(0.05);
  await page
    .getByRole("button", { name: "Store controls", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Graphics settings", exact: true })
    .click();
  await page.getByRole("button", { name: /Lightweight/ }).click();
  await expect(canvas).toHaveAttribute("data-npc-rose-model", "loaded", {
    timeout: 30000,
  });
  await expect(canvas).toHaveAttribute("data-npc-count", "2");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", { name: "Store controls", exact: true })
    .click();
  await page
    .getByRole("button", { name: "How to explore", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "3D model credits", exact: true }),
  ).toHaveAttribute("href", "/models/credits.html");
  expect(errors).toEqual([]);
});
test("a missing imported model falls back without taking down shopping or movement", async ({
  page,
}) => {
  await mockCms(page);
  await page.route("**/models/sketchfab/**/*.glb", (r) =>
    r.fulfill({ status: 404, body: "Not found" }),
  );
  await page.goto("/");
  const canvas = page.getByTestId("store-canvas");
  await expect(canvas).toHaveAttribute("data-npc-rose-model", "fallback", {
    timeout: 15000,
  });
  await expect(canvas).toHaveAttribute("data-displayed-products", "21");
  await expect(canvas).toHaveAttribute("data-basket-visible", "true");
  await page.getByRole("button", { name: "Product view", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
