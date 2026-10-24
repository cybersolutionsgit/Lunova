import { test, expect } from "@playwright/test";
import { mockCms, openAdmin } from "./helpers/cms.js";
import { defaultCatalog } from "../../src/lib/products.js";
test("photo displays stay interactive and Admin has no retired generation controls", async ({
  page,
}) => {
  const catalog = structuredClone(defaultCatalog);
  catalog.products[0] = {
    ...catalog.products[0],
    modelUrl: "/api/models/" + "a".repeat(64) + ".glb",
    autoModel: true,
  };
  await mockCms(page, { catalog });
  const modelRequests = [];
  page.on("request", (r) => {
    if (/\/api\/(?:admin\/)?models\//.test(r.url()))
      modelRequests.push(r.url());
  });
  await page.goto("/");
  await expect(page.getByTestId("player-marker")).toHaveAttribute(
    "data-z",
    "9.00",
  );
  const canvas = page.getByTestId("store-canvas"),
    box = await canvas.boundingBox();
  await canvas.click({
    position: { x: box.width * 0.5, y: box.height * 0.49 },
  });
  await expect(
    page.getByRole("dialog", { name: "A closer look" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await openAdmin(page);
  await expect(
    page.getByRole("button", { name: /Generate missing|Check free 3D/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: new RegExp(catalog.products[0].name + ".*Edit"),
    })
    .click();
  await expect(
    page.getByRole("checkbox", { name: /Automatically generate/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Generate model from/ }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Featured image URL", { exact: true }),
  ).toHaveValue(catalog.products[0].image);
  expect(modelRequests).toEqual([]);
});
