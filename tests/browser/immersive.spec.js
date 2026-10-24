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
test("desktop look stays centred, menus release capture and returning resumes without drift", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.getByTestId("store-canvas");
  await expect(canvas).toHaveAttribute("data-look-yaw", "0");
  await page.mouse.move(550, 420);
  await page.mouse.move(700, 440);
  expect(await canvas.getAttribute("data-look-yaw")).toBe("0");
  await page
    .getByRole("button", { name: "Click to look around", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.pointerLockElement))
    .toBe(true);
  await page.mouse.move(800, 450, { steps: 5 });
  await expect
    .poll(async () =>
      Math.abs(Number(await canvas.getAttribute("data-look-yaw"))),
    )
    .toBeGreaterThan(0.1);
  await canvas.evaluate(() => document.exitPointerLock());
  await expect
    .poll(() => page.evaluate(() => !!document.pointerLockElement))
    .toBe(false);
  await page
    .getByRole("button", { name: "Store controls", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Graphics settings", exact: true })
    .click();
  const yaw = await canvas.getAttribute("data-look-yaw");
  await page.mouse.move(500, 370);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.mouse.move(820, 450);
  await page.waitForTimeout(200);
  expect(await canvas.getAttribute("data-look-yaw")).toBe(yaw);
  await page
    .getByRole("button", { name: "Click to look around", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.pointerLockElement))
    .toBe(true);
  // Pointer-lock input is relative, independent of the menu cursor position.
  await canvas.dispatchEvent("pointermove", {
    pointerType: "mouse",
    buttons: 0,
    movementX: 10,
    movementY: 0,
  });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-look-yaw")))
    .not.toBe(Number(yaw));
  expect(
    Math.abs(Number(await canvas.getAttribute("data-look-yaw")) - Number(yaw)),
  ).toBeLessThan(0.1);
});
test("product popups remain inside browser full screen", async ({ page }) => {
  await page.goto("/");
  const canvas = page.getByTestId("store-canvas");
  await expect(page.getByTestId("player-marker")).toHaveAttribute(
    "data-z",
    "9.00",
  );
  await page
    .getByRole("button", { name: "Store controls", exact: true })
    .click();
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
    .getByRole("button", { name: "Store controls", exact: true })
    .click();
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
test("mobile view is clear by default and important controls expand only when requested", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const canvas = page.getByTestId("store-canvas");
  await expect(canvas).toBeVisible();
  await expect(
    page.locator(
      ".scene-greeting,.scene-top,.world-bottom,.store-toolbar,.store-demo-label",
    ),
  ).toHaveCount(0);
  await expect(page.locator(".minimap")).toBeHidden();
  await expect(page.getByTestId("touch-joystick")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Movement controls", exact: true }),
  ).toHaveCount(0);
  const before = await canvas.boundingBox();
  await page
    .getByRole("button", { name: "Store controls", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Graphics settings", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show map", exact: true }).click();
  await expect(page.locator(".minimap")).toBeVisible();
  expect(await canvas.boundingBox()).toEqual(before);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("holding a mouse button pauses look and release resumes without a jump", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.getByTestId("store-canvas");
  await expect(canvas).toHaveAttribute("data-look-yaw", "0");
  await page
    .getByRole("button", { name: "Click to look around", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.pointerLockElement))
    .toBe(true);
  await canvas.dispatchEvent("pointermove", {
    pointerType: "mouse",
    buttons: 0,
    movementX: 150,
    movementY: -200,
  });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-look-yaw")))
    .toBeLessThan(-0.1);
  await page.mouse.down();
  const yaw = await canvas.getAttribute("data-look-yaw");
  await page.mouse.move(800, 680, { steps: 5 });
  await page.waitForTimeout(200);
  expect(await canvas.getAttribute("data-look-yaw")).toBe(yaw);
  await page.mouse.up();
  await canvas.dispatchEvent("pointermove", {
    pointerType: "mouse",
    buttons: 0,
    movementX: 10,
    movementY: 0,
  });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-look-yaw")))
    .toBeLessThan(Number(yaw));
  expect(
    Math.abs(Number(await canvas.getAttribute("data-look-yaw")) - Number(yaw)),
  ).toBeLessThan(0.05);
});

test("touch joystick walks, keeps camera steady and stops on release or collapse", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  const marker = page.getByTestId("player-marker");
  const canvas = page.getByTestId("store-canvas");
  await expect(marker).toHaveAttribute("data-z", "9.00");
  const box = await page
    .getByRole("button", { name: "Touch movement area", exact: true })
    .boundingBox();
  const session = await context.newCDPSession(page);
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: y - 36 }],
  });
  await expect
    .poll(async () => Number(await marker.getAttribute("data-z")))
    .toBeLessThan(8.5);
  expect(await canvas.getAttribute("data-look-yaw")).toBe("0");
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(200);
  const stopped = await marker.getAttribute("data-z");
  await page.waitForTimeout(250);
  expect(await marker.getAttribute("data-z")).toBe(stopped);
  await expect(page.getByTestId("touch-joystick")).toHaveCount(0);
  // Cancellation also hides the transient control and clears movement.
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await expect(page.getByTestId("touch-joystick")).toBeVisible();
  await session.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.getByTestId("touch-joystick")).toHaveCount(0);
  await context.close();
});

test("captured centre click opens a product and releases the mouse for its popup", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("player-marker")).toHaveAttribute(
    "data-z",
    "9.00",
  );
  await page
    .getByRole("button", { name: "Click to look around", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.pointerLockElement))
    .toBe(true);
  await page.mouse.down();
  await page.mouse.up();
  await expect(
    page.getByRole("dialog", { name: "A closer look" }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!document.pointerLockElement))
    .toBe(false);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Click to look around", exact: true }),
  ).toBeVisible();
});
