import { test, expect } from "@playwright/test";
test("3D fills the screen and the sidebar overlays it without replacing the canvas", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.getByTestId("store-canvas");
  await expect(canvas).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Boutique sidebar" }),
  ).toHaveCount(0);
  await canvas.evaluate((c) => (window.originalStoreCanvas = c));
  const before = await canvas.boundingBox();
  const viewport = page.viewportSize();
  expect(before.width).toBe(viewport.width);
  expect(before.height).toBe(viewport.height);
  await page
    .getByRole("button", { name: "Open store sidebar", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Boutique sidebar" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close store sidebar", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  expect(await canvas.boundingBox()).toEqual(before);
  await page
    .getByRole("button", { name: "Close store sidebar", exact: true })
    .click();
  await page.getByRole("button", { name: "Product view", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Your collection" }),
  ).toBeVisible();
  expect(await canvas.evaluate((c) => c === window.originalStoreCanvas)).toBe(
    true,
  );
  await page
    .getByRole("button", {
      name: "View Black Fishnet Lingerie Set with Red Floral Embroidery",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", { name: "A closer look" });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((el) => !!el.closest(".immersive-world"))).toBe(
    true,
  );
  expect(await canvas.evaluate((c) => c === window.originalStoreCanvas)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await canvas.evaluate((c) => c === window.originalStoreCanvas)).toBe(
    true,
  );
});
test("hovering turns the camera without a mouse button and UI panels pause controls", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.getByTestId("store-canvas");
  await expect(canvas).toHaveAttribute("data-look-yaw", "0");
  await page.mouse.move(550, 420);
  await page.mouse.move(700, 440, { steps: 5 });
  await expect
    .poll(async () =>
      Math.abs(Number(await canvas.getAttribute("data-look-yaw"))),
    )
    .toBeGreaterThan(0.1);
  await page.getByRole("button", { name: "Graphics settings" }).click();
  const yaw = await canvas.getAttribute("data-look-yaw");
  const pos = await page.getByTestId("player-marker").getAttribute("data-z");
  await page.mouse.move(550, 370);
  await page.mouse.move(820, 450, { steps: 5 });
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(400);
  await page.keyboard.up("KeyW");
  expect(await canvas.getAttribute("data-look-yaw")).toBe(yaw);
  expect(await page.getByTestId("player-marker").getAttribute("data-z")).toBe(
    pos,
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.mouse.move(550, 420);
  await page.mouse.move(650, 430, { steps: 4 });
  await expect
    .poll(async () => await canvas.getAttribute("data-look-yaw"))
    .not.toBe(yaw);
});
test("product popups remain inside browser full screen", async ({ page }) => {
  await page.goto("/");
  const canvas = page.getByTestId("store-canvas");
  await expect(page.getByTestId("player-marker")).toHaveAttribute(
    "data-z",
    "9.00",
  );
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  const box = await canvas.boundingBox();
  await canvas.click({
    position: { x: box.width * 0.5, y: box.height * 0.49 },
  });
  await expect(
    page.getByRole("dialog", { name: "A closer look" }),
  ).toBeVisible();
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => document.fullscreenElement.contains(el)),
  ).toBe(true);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Exit full screen", exact: true })
    .click();
});
test("touch screens retain drag look without opening the product underneath", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  const canvas = page.getByTestId("store-canvas");
  await expect(canvas).toHaveAttribute("data-look-yaw", "0");
  const session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 180, y: 400 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 245, y: 425 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () =>
      Math.abs(Number(await canvas.getAttribute("data-look-yaw"))),
    )
    .toBeGreaterThan(0.1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await context.close();
});
