import { test, expect } from "@playwright/test";
import { mockCms, openAdmin } from "./helpers/cms.js";
import { defaultCatalog } from "../../src/lib/products.js";
test("supplied catalog loads by default with featured images, PKR prices and original product links", async ({
  page,
}) => {
  await mockCms(page);
  await page.goto("/");
  await expect(
    page.getByText("Demo shopping · 21 products · No real orders"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Product view", exact: true }).click();
  await expect(page.getByRole("button", { name: /^View / })).toHaveCount(21);
  for (const product of defaultCatalog.products) {
    const response = await page.request.get(product.image);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toMatch(/image\//);
  }
  const p = defaultCatalog.products[0];
  await page
    .getByRole("button", { name: `View ${p.name}`, exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("3,499");
  await expect(dialog).toContainText("PKR");
  await expect(
    dialog.getByRole("img", { name: p.name, exact: true }),
  ).toHaveAttribute("src", p.image);
  await expect
    .poll(() =>
      dialog
        .getByRole("img", { name: p.name, exact: true })
        .evaluate((img) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(
    dialog.getByRole("link", {
      name: "View original product on Lunova Secrets",
    }),
  ).toHaveAttribute("href", p.sourceUrl);
  await page
    .getByRole("button", { name: "Add to my bag", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: /My bag/ }).click();
  await expect(page.getByRole("dialog")).toContainText("3,499");
  await expect(page.getByRole("dialog")).toContainText(
    "Checkout is not enabled",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await openAdmin(page);
  await page.getByText("Replace with sample catalog", { exact: true }).click();
  await page
    .getByRole("button", { name: "Publish samples", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Signature lace set.*Edit/ }),
  ).toBeVisible();
  await page
    .getByText("Restore bundled website catalog", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publish bundled catalog", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: new RegExp(p.name + ".*Edit") }),
  ).toBeVisible();
});
