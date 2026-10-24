import { test, expect } from "@playwright/test";
test("3D scene renders and sample product cart persists without checkout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your everyday shop/ }),
  ).toBeVisible();
  await expect(page.getByTestId("store-canvas")).toBeVisible();
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Product view", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "View Hass avocados", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View Hass avocados", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Creamy, buttery");
  await page
    .getByRole("button", { name: "Add to my bag", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: /My bag/ }).click();
  await expect(page.getByRole("dialog")).toContainText("$3.50");
  await expect(page.getByRole("dialog")).toContainText(
    "Checkout is not enabled",
  );
  await page.getByRole("button", { name: "Increase Hass avocados" }).click();
  await expect(page.getByRole("dialog")).toContainText("$7.00");
  await page.reload();
  await page.getByRole("button", { name: /My bag/ }).click();
  await expect(page.getByRole("dialog")).toContainText("$7.00");
  await page.getByRole("button", { name: "Remove Hass avocados" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "A little room for good things.",
  );
  expect(errors).toEqual([]);
});
test("search, graphics settings, keyboard dialog dismissal and mobile layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const marker = page.getByTestId("player-marker");
  await expect(marker).toHaveAttribute("data-z", "9.00");
  const forward = await page
    .getByRole("button", { name: "Move forward" })
    .boundingBox();
  await page.mouse.move(
    forward.x + forward.width / 2,
    forward.y + forward.height / 2,
  );
  await page.mouse.down();
  await expect
    .poll(async () => Number(await marker.getAttribute("data-z")))
    .toBeLessThan(8.5);
  await page.mouse.up();
  await page.getByRole("button", { name: "Graphics settings" }).click();
  await page.getByRole("button", { name: /Lightweight/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Move forward" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Product view", exact: true }).click();
  await page.getByRole("textbox", { name: "Search products" }).fill("milk");
  await expect(page.getByRole("button", { name: /^View / })).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "View Organic whole milk" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("walking changes position and stops at a shelf, aisle shortcuts reset safely", async ({
  page,
}) => {
  await page.goto("/");
  const marker = page.getByTestId("player-marker");
  await expect(marker).toHaveAttribute("data-z", "9.00");
  await page.keyboard.down("KeyW");
  await expect
    .poll(async () => Number(await marker.getAttribute("data-z")))
    .toBeLessThan(8);
  await expect
    .poll(async () => Number(await marker.getAttribute("data-z")), {
      timeout: 12000,
    })
    .toBeLessThan(3);
  await page.waitForTimeout(600);
  await page.keyboard.up("KeyW");
  const stopped = Number(await marker.getAttribute("data-z"));
  expect(stopped).toBeGreaterThanOrEqual(2.27);
  await page.getByRole("button", { name: "Return to entrance" }).click();
  await expect(marker).toHaveAttribute("data-z", "9.00");
  await page
    .getByRole("button", { name: "Fruit & vegetables", exact: true })
    .click();
  await expect(marker).toHaveAttribute("data-x", "-7.30");
  await expect(marker).toHaveAttribute("data-z", "3.50");
});
test("a product can be selected directly from a 3D shelf", async ({ page }) => {
  await page.goto("/");
  const canvas = page.getByTestId("store-canvas");
  await expect(canvas).toBeVisible();
  await expect(page.getByTestId("player-marker")).toHaveAttribute(
    "data-z",
    "9.00",
  );
  const box = await canvas.boundingBox();
  await canvas.click({
    position: { x: box.width * 0.5, y: box.height * 0.49 },
  });
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Artisan sourdough");
  await page
    .getByRole("button", { name: "Add to my bag", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Artisan sourdough added",
  );
});
