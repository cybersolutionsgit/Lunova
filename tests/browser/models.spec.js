import { test, expect } from "@playwright/test";
import { mockCms, openAdmin } from "./helpers/cms.js";
import { defaultCatalog } from "../../src/lib/products.js";
import { fixtureGlb } from "../helpers/glb.js";
const modelUrl = "/api/models/" + "a".repeat(64) + ".glb";
async function modelRoutes(page, { fail = false } = {}) {
  let generations = 0,
    downloads = 0;
  await page.route("**/api/admin/models/**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/status"))
      return route.fulfill({ json: { ready: true, provider: "Test fixture" } });
    generations++;
    const body = route.request().postDataJSON();
    expect(body.image).toMatch(/^data:image\/jpeg;base64,/);
    return fail
      ? route.fulfill({
          status: 429,
          json: { error: "The free GPU quota is exhausted." },
        })
      : route.fulfill({ json: { modelUrl, cached: false } });
  });
  await page.route("**/api/models/*.glb", (route) => {
    downloads++;
    return route.fulfill({
      body: Buffer.from(fixtureGlb()),
      contentType: "model/gltf-binary",
    });
  });
  return { generations: () => generations, downloads: () => downloads };
}
async function editFirst(page) {
  await openAdmin(page);
  await page
    .getByRole("button", {
      name: new RegExp(defaultCatalog.products[0].name + ".*Edit"),
    })
    .click();
}
test("admin automatic photo-to-model generation persists, renders locally and does not regenerate unchanged photos", async ({
  page,
}) => {
  await mockCms(page);
  const provider = await modelRoutes(page);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await editFirst(page);
  await page
    .getByLabel(
      "Automatically generate a 3D model when publishing a new or changed photo",
    )
    .check();
  await page
    .getByRole("button", { name: "Publish product", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Generate missing 3D models/ }),
  ).toBeVisible();
  expect(provider.generations()).toBe(1);
  await expect.poll(provider.downloads).toBeGreaterThan(0);
  await expect
    .poll(async () =>
      Number(
        await page
          .getByTestId("store-canvas")
          .getAttribute("data-models-loaded"),
      ),
    )
    .toBe(1);
  await page.reload();
  await editFirst(page);
  await expect(page.getByText(/3D model saved for this product/)).toBeVisible();
  await page
    .getByRole("button", { name: "Publish product", exact: true })
    .click();
  expect(provider.generations()).toBe(1);
  expect(errors).toEqual([]);
});
test("quota failures publish the original photo with an honest warning and never attach a fake model", async ({
  page,
}) => {
  await mockCms(page);
  const provider = await modelRoutes(page, { fail: true });
  await page.goto("/");
  await editFirst(page);
  await page
    .getByLabel(
      "Automatically generate a 3D model when publishing a new or changed photo",
    )
    .check();
  await page
    .getByRole("button", { name: "Publish product", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Product photo published",
  );
  await expect(page.getByRole("alert")).toContainText("quota");
  expect(provider.downloads()).toBe(0);
});
test("batch generation stops at free-service failure without replacing the catalog", async ({
  page,
}) => {
  await mockCms(page);
  const provider = await modelRoutes(page, { fail: true });
  await page.goto("/");
  await openAdmin(page);
  await page
    .getByRole("button", { name: "Generate missing 3D models", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "0 models published before stopping",
  );
  expect(provider.generations()).toBe(1);
  await expect(
    page.getByRole("button", {
      name: new RegExp(defaultCatalog.products[0].name + ".*Edit"),
    }),
  ).toBeVisible();
});

test("a failed model load falls back without breaking the store", async ({
  page,
}) => {
  const catalog = structuredClone(defaultCatalog);
  catalog.products[0].modelUrl = modelUrl;
  await mockCms(page, { catalog });
  await page.route("**/api/models/*.glb", (route) =>
    route.fulfill({ status: 404, body: "Missing model" }),
  );
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByTestId("store-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Product view", exact: true }).click();
  await page
    .getByRole("button", {
      name: `View ${catalog.products[0].name}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "A closer look" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
