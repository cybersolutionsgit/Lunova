import { test, expect } from "@playwright/test";
import { mockCms, openAdmin } from "./helpers/cms.js";
import { STORE_TYPES } from "../../src/lib/shop.js";
test("customers have no customize controls and admin is login-only with no signup", async ({
  page,
}) => {
  await mockCms(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: /customize/i })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Open store sidebar", exact: true })
    .click();
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await expect(
    page.getByRole("button", { name: /sign up|register/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add a product", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Username", { exact: true }).fill("wrong");
  await page.getByLabel("Password", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Invalid username or password",
  );
  await expect(
    page.getByRole("button", { name: "Add a product", exact: true }),
  ).toHaveCount(0);
});
test("authenticated settings publish all nine niche environments and theme/details", async ({
  page,
}) => {
  // Nine scene rebuilds can exceed the default timeout under software WebGL.
  test.setTimeout(60000);
  await mockCms(page);
  await page.goto("/");
  await openAdmin(page);
  await page
    .getByRole("button", { name: "Store & theme", exact: true })
    .click();
  for (const [id, type] of Object.entries(STORE_TYPES)) {
    await page.getByLabel("Store type", { exact: true }).selectOption(id);
    await page
      .getByLabel("Store name", { exact: true })
      .fill("My " + type.name);
    await page.getByLabel("Buttons & accents").fill("#244c3d");
    await page.getByLabel("Store walls").fill("#eadcc7");
    await page.getByRole("button", { name: "Publish store settings" }).click();
    await expect(page.getByTestId("store-canvas")).toHaveAttribute(
      "data-store-type",
      id,
    );
    await expect(page.getByLabel("Store name", { exact: true })).toHaveValue(
      "My " + type.name,
    );
  }
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.getByText("MY GENERAL STORE", { exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator(".store-shell")
      .evaluate((el) => el.style.getPropertyValue("--shop-primary")),
  ).toBe("#244c3d");
  await page.reload();
  await expect(
    page.getByText("MY GENERAL STORE", { exact: true }),
  ).toBeVisible();
  await openAdmin(page);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add a product", exact: true }),
  ).toHaveCount(0);
});
test("missing backend keeps browsing available and fails admin login closed", async ({
  page,
}) => {
  await page.route("**/api/**", (r) =>
    r.fulfill({
      status: 503,
      json: {
        error: "Admin setup is incomplete. Connect DB and ADMIN_PASSWORD.",
      },
    }),
  );
  await page.goto("/");
  await expect(page.getByTestId("store-canvas")).toBeVisible();
  await page
    .getByRole("button", { name: "Open store sidebar", exact: true })
    .click();
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Customers can continue browsing",
  );
  await page.getByLabel("Username", { exact: true }).fill("test");
  await page.getByLabel("Password", { exact: true }).fill("test");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("setup is incomplete");
  await expect(
    page.getByRole("button", { name: "Publish store settings" }),
  ).toHaveCount(0);
});
