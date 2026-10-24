import { test, expect } from "@playwright/test";
import { sampleCatalog } from "../../src/lib/products.js";
import { mockCms, openAdmin } from "./helpers/cms.js";
test.beforeEach(async ({ page }) => {
  await mockCms(page, { catalog: sampleCatalog });
});
const openEditor = openAdmin;
test("3D boutique renders, catalog and demo bag persist without checkout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your private boutique/ }),
  ).toBeVisible();
  await expect(page.getByTestId("store-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Product view", exact: true }).click();
  await page
    .getByRole("button", { name: "View Signature lace set", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("placeholder");
  await page
    .getByRole("button", { name: "Add to my bag", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: /My bag/ }).click();
  await expect(page.getByRole("dialog")).toContainText("$48.00");
  await expect(page.getByRole("dialog")).toContainText(
    "Checkout is not enabled",
  );
  await page
    .getByRole("button", { name: "Increase Signature lace set" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("$96.00");
  await page.reload();
  await page.getByRole("button", { name: /My bag/ }).click();
  await expect(page.getByRole("dialog")).toContainText("$96.00");
  await page.getByRole("button", { name: "Remove Signature lace set" }).click();
  await expect(page.getByRole("dialog")).toContainText("A little room");
  expect(errors).toEqual([]);
});
test("mobile touch movement, graphics, search and responsive width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const marker = page.getByTestId("player-marker");
  await expect(marker).toHaveAttribute("data-z", "9.00");
  const forward = await page
    .getByRole("button", { name: "Touch movement area" })
    .boundingBox();
  await page.mouse.move(
    forward.x + forward.width / 2,
    forward.y + forward.height * 0.2,
  );
  await page.mouse.down();
  await page.mouse.move(
    forward.x + forward.width / 2,
    forward.y + forward.height * 0.2 - 38,
  );
  await expect
    .poll(async () => Number(await marker.getAttribute("data-z")))
    .toBeLessThan(8.5);
  await page.mouse.up();
  await page
    .getByRole("button", { name: "Store controls", exact: true })
    .click();
  await page.getByRole("button", { name: "Graphics settings" }).click();
  await page.getByRole("button", { name: /Lightweight/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Product view", exact: true }).click();
  await page.getByRole("textbox", { name: "Search products" }).fill("robe");
  await expect(page.getByRole("button", { name: /^View / })).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await openEditor(page);
  await page
    .getByRole("button", { name: "Add a product", exact: true })
    .click();
  await expect(page.getByLabel("Product name", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
});
test("walking stops at the feature fixture and collection shortcuts are safe", async ({
  page,
}) => {
  await page.goto("/");
  const marker = page.getByTestId("player-marker");
  await expect(marker).toHaveAttribute("data-z", "9.00");
  await page.keyboard.down("KeyW");
  await expect
    .poll(async () => Number(await marker.getAttribute("data-z")), {
      timeout: 12000,
    })
    .toBeLessThan(4.2);
  await page.waitForTimeout(500);
  await page.keyboard.up("KeyW");
  expect(Number(await marker.getAttribute("data-z"))).toBeGreaterThanOrEqual(
    3.97,
  );
  await page
    .getByRole("button", { name: "Store controls", exact: true })
    .click();
  await page.getByRole("button", { name: "Return to entrance" }).click();
  await expect(marker).toHaveAttribute("data-z", "9.00");
  await page
    .getByRole("button", { name: "Open store sidebar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Bras & bralettes", exact: true })
    .click();
  await expect(marker).toHaveAttribute("data-x", "-4.30");
  await expect(marker).toHaveAttribute("data-z", "4.00");
});
test("a featured photo on a 3D clothing rail opens its product", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.getByTestId("store-canvas");
  await expect(page.getByTestId("player-marker")).toHaveAttribute(
    "data-z",
    "9.00",
  );
  const box = await canvas.boundingBox();
  await canvas.click({
    position: { x: box.width * 0.5, y: box.height * 0.49 },
  });
  await expect(page.getByRole("dialog")).toContainText("Signature lace set");
  await page
    .getByRole("button", { name: "Add to my bag", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Signature lace set added",
  );
});
test("owner can create, edit, reload, move and delete a local product", async ({
  page,
}) => {
  await page.goto("/");
  await openEditor(page);
  await expect(page.getByRole("dialog")).toContainText(
    "Product saves update your shared storefront",
  );
  await page
    .getByRole("button", { name: "Add a product", exact: true })
    .click();
  await page.getByLabel("Product name", { exact: true }).fill("My custom robe");
  await page.getByLabel("Collection", { exact: true }).selectOption("robes");
  await page.getByLabel("Price (USD)").fill("39.95");
  await page.getByLabel("Display position").selectOption("8");
  await page.getByRole("button", { name: "Publish product" }).click();
  await expect(
    page.getByRole("button", { name: /My custom robe.*Display 9/ }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Product view", exact: true }).click();
  await page
    .getByRole("button", { name: "View My custom robe", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("$39.95");
  await page
    .getByRole("button", { name: "Add to my bag", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await openEditor(page);
  await page.getByRole("button", { name: /My custom robe.*Edit/ }).click();
  await page.getByLabel("Product name", { exact: true }).fill("Updated robe");
  await page.getByLabel("Demo bag quantity limit").fill("0");
  await page.getByRole("button", { name: "Publish product" }).click();
  await page
    .getByRole("button", { name: "Delete Updated robe", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove product", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Updated robe.*Edit/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: /My bag/ }).click();
  await expect(page.getByRole("dialog")).toContainText("A little room");
});
test("website import previews public products and preserves featured images and currency", async ({
  page,
}) => {
  await page.route(
    "https://lunovasecrets.com/wp-json/wc/store/v1/products?**",
    (route) =>
      route.fulfill({
        json: [
          {
            id: 42,
            name: "Website lace robe",
            description: "<p>Your public product.</p>",
            categories: [{ name: "Robes" }],
            prices: {
              price: "450000",
              currency_code: "PKR",
              currency_minor_unit: 2,
            },
            images: [
              { src: "https://lunovasecrets.com/wp-content/uploads/robe.jpg" },
            ],
            permalink: "https://lunovasecrets.com/product/robe/",
            is_in_stock: true,
          },
        ],
        headers: { "X-WP-TotalPages": "1" },
      }),
  );
  await page.route(
    "https://lunovasecrets.com/wp-content/uploads/robe.jpg",
    async (route) =>
      route.fulfill({
        path: "public/products/robes.svg",
        contentType: "image/svg+xml",
      }),
  );
  await page.goto("/");
  await openEditor(page);
  await page
    .getByRole("button", { name: "Import from my website", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review import · 1 products" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Signature lace set.*Edit/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Publish imported catalog" }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Product view", exact: true }).click();
  await page
    .getByRole("button", { name: "View Website lace robe", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("PKR");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("img", { name: "Website lace robe", exact: true }),
  ).toHaveAttribute(
    "src",
    "https://lunovasecrets.com/wp-content/uploads/robe.jpg",
  );
  await expect(
    page.getByRole("link", { name: "View original product on Lunova Secrets" }),
  ).toHaveAttribute("href", "https://lunovasecrets.com/product/robe/");
});
test("blocked imports show actionable errors and leave the catalog intact", async ({
  page,
}) => {
  await page.route(
    "https://lunovasecrets.com/wp-json/wc/store/v1/products?**",
    (r) => r.fulfill({ status: 403, body: "Forbidden" }),
  );
  await page.goto("/");
  await openEditor(page);
  await page
    .getByRole("button", { name: "Import from my website", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Import file");
  await expect(
    page.getByRole("button", { name: /Signature lace set.*Edit/ }),
  ).toBeVisible();
  await page
    .locator('input[type=file][accept="application/json,.json"]')
    .setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        '{"version":1,"currency":"USD","products":[{"id":"bad"}]}',
      ),
    });
  await expect(page.getByRole("alert")).toContainText("name");
  await expect(
    page.getByRole("button", { name: /Signature lace set.*Edit/ }),
  ).toBeVisible();
});
test("uploaded photos survive reload and exported catalogs can be imported again", async ({
  page,
}) => {
  await page.goto("/");
  await openEditor(page);
  await page.getByRole("button", { name: /Signature lace set.*Edit/ }).click();
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 20;
    c.height = 30;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#8b5263";
    ctx.fillRect(0, 0, 20, 30);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator('input[type=file][accept="image/jpeg,image/png,image/webp"]')
    .setInputFiles({
      name: "my-product.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
  await expect(page.getByLabel("Featured image URL")).toHaveValue(
    /^data:image\/jpeg;base64,/,
  );
  await page.getByRole("button", { name: "Publish product" }).click();
  await expect(
    page.getByRole("button", { name: "Export catalog" }),
  ).toBeEnabled();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export catalog" }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("lunova-catalog.json");
  await page.getByText("Replace with sample catalog", { exact: true }).click();
  await page
    .getByRole("button", { name: "Publish samples", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Import file", exact: true }),
  ).toBeEnabled();
  await page
    .locator('input[type=file][accept="application/json,.json"]')
    .setInputFiles(await file.path());
  await expect(
    page.getByRole("heading", { name: "Review import · 8 products" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Publish imported catalog" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Product view", exact: true }).click();
  await page
    .getByRole("button", { name: "View Signature lace set", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Signature lace set", exact: true }).last(),
  ).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
});
