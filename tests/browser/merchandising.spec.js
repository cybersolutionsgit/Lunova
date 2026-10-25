import { test, expect } from "@playwright/test";
import { PerspectiveCamera, Vector3 } from "three";
import { mockCms, openAdmin } from "./helpers/cms.js";
import { defaultCatalog } from "../../src/lib/products.js";
import { productPlacement } from "../../src/lib/merchandising.js";
function screenPoint(position) {
  const camera = new PerspectiveCamera(65, 1280 / 720, 0.1, 65);
  camera.position.set(0, 1.75, 9);
  camera.rotation.order = "YXZ";
  camera.rotation.set(-0.05, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const point = new Vector3(...position).project(camera);
  return { x: (point.x + 1) * 640, y: (1 - point.y) * 360 };
}
test("two products on the same rack select independently and the carried basket follows the persisted cart", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await mockCms(page);
  await page.goto("/");
  const canvas = page.getByTestId("store-canvas");
  await expect(canvas).toHaveAttribute("data-displayed-products", "21");
  await expect(canvas).toHaveAttribute("data-basket-visible", "true");
  const products = defaultCatalog.products.filter((p) => p.display === 0);
  expect(products.length).toBeGreaterThan(1);
  for (const product of products.slice(0, 2)) {
    const position = productPlacement("boutique", product.displaySlot).photo;
    const point = screenPoint([position[0], position[1], position[2] + 3]);
    await page.touchscreen.tap(point.x, point.y);
    await expect(
      page.getByRole("dialog", { name: "A closer look" }),
    ).toContainText(product.name);
    await page
      .getByRole("button", { name: "Add to my bag", exact: true })
      .tap();
    await page.getByRole("button", { name: "Close dialog", exact: true }).tap();
  }
  await expect(canvas).toHaveAttribute("data-basket-count", "2");
  await page.reload();
  await expect(canvas).toHaveAttribute("data-basket-count", "2");
  await page.getByRole("button", { name: /My bag/ }).tap();
  for (const product of products.slice(0, 2))
    await expect(page.getByRole("dialog")).toContainText(product.name);
  await context.close();
});
test("Admin assigns independent positions within one fixture and retains them after reload", async ({
  page,
}) => {
  await mockCms(page);
  await page.goto("/");
  await openAdmin(page);
  const product = defaultCatalog.products[0];
  const edit = () =>
    page
      .getByRole("button", { name: new RegExp(product.name + ".*Edit") })
      .click();
  await edit();
  const position = page.getByLabel("Position on fixture", { exact: true });
  await expect(position.locator('option[value="1"]')).toHaveJSProperty(
    "disabled",
    true,
  );
  await position.selectOption("2");
  await page
    .getByRole("button", { name: "Publish product", exact: true })
    .click();
  await page.reload();
  await openAdmin(page);
  await edit();
  await expect(position).toHaveValue("2");
});
