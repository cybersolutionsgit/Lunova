import { test, expect } from "@playwright/test";
import { mockCms, openAdmin } from "./helpers/cms.js";
const model = {
  uid: "a".repeat(32),
  name: "Supermarket shelf (test fixture)",
  source: "https://sketchfab.com/3d-models/" + "a".repeat(32),
  creator: { name: "Test creator", url: "https://sketchfab.com/test-creator" },
  license: {
    code: "by",
    name: "CC Attribution",
    url: "https://creativecommons.org/licenses/by/4.0/",
  },
  thumbnail: "",
  downloadable: true,
  commercialImportAllowed: true,
};
test("Admin searches supermarket shelf with filters and keeps creator/license attribution", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mockCms(page);
  let received;
  await page.route("**/api/admin/sketchfab/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/status"))
      return route.fulfill({ json: { configured: false, connected: false } });
    if (url.pathname.endsWith("/search")) {
      received = url;
      return route.fulfill({
        json: {
          results: [
            model,
            {
              ...model,
              uid: "b".repeat(32),
              name: "Restricted model",
              downloadable: false,
              commercialImportAllowed: false,
            },
          ],
          nextOffset: null,
        },
      });
    }
    return route.fulfill({ status: 503, json: { error: "Not configured" } });
  });
  await page.goto("/");
  await openAdmin(page);
  await page.getByRole("button", { name: "3D models", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Connect Sketchfab", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Model license", { exact: true }).selectOption("by");
  await page
    .getByRole("button", { name: "Search Sketchfab", exact: true })
    .click();
  await expect(page.getByText(model.name, { exact: true })).toBeVisible();
  expect(received.searchParams.get("q")).toBe("supermarket shelf");
  expect(received.searchParams.get("license")).toBe("by");
  await expect(
    page.getByRole("link", { name: "Test creator", exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("button", {
      name: "Prepare authorized download",
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", {
      name: "Prepare authorized download",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(page.getByText(/Reference only: license/)).toBeVisible();
  await expect(
    page.getByText("Preview a local GLB / glTF", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("local glTF preview blocks external resources before any outbound fetch", async ({
  page,
}) => {
  await mockCms(page);
  await page.route("**/api/admin/sketchfab/status", (r) =>
    r.fulfill({ json: { configured: false, connected: false } }),
  );
  let external = 0;
  await page.route("https://evil.test/**", (r) => {
    external++;
    return r.abort();
  });
  await page.goto("/");
  await openAdmin(page);
  await page.getByRole("button", { name: "3D models", exact: true }).click();
  await page.locator('input[accept=".glb"]').setInputFiles({
    name: "scene.glb",
    mimeType: "model/gltf+json",
    buffer: glb({
      asset: { version: "2.0" },
      buffers: [{ uri: "https://evil.test/model.bin" }],
    }),
  });
  await expect(page.getByRole("alert")).toContainText(
    "local relative file paths",
  );
  expect(external).toBe(0);
});

function glb(document, binary = Buffer.alloc(0)) {
  let json = Buffer.from(JSON.stringify(document));
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
  const length = 20 + json.length + (binary.length ? 8 + binary.length : 0),
    data = Buffer.alloc(length);
  data.writeUInt32LE(0x46546c67, 0);
  data.writeUInt32LE(2, 4);
  data.writeUInt32LE(length, 8);
  data.writeUInt32LE(json.length, 12);
  data.writeUInt32LE(0x4e4f534a, 16);
  json.copy(data, 20);
  if (binary.length) {
    data.writeUInt32LE(binary.length, 20 + json.length);
    data.writeUInt32LE(0x004e4942, 24 + json.length);
    binary.copy(data, 28 + json.length);
  }
  return data;
}
test("local GLB preview renders a procedural test triangle without changing the store catalog", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mockCms(page);
  await page.route("**/api/admin/sketchfab/status", (r) =>
    r.fulfill({ json: { configured: false, connected: false } }),
  );
  await page.goto("/");
  await openAdmin(page);
  await page.getByRole("button", { name: "3D models", exact: true }).click();
  const binary = Buffer.from(
    new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0]).buffer,
  );
  const bytes = glb(
    {
      asset: { version: "2.0" },
      buffers: [{ byteLength: 36 }],
      bufferViews: [{ buffer: 0, byteLength: 36 }],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 3,
          type: "VEC3",
          min: [-0.5, 0, 0],
          max: [0.5, 1, 0],
        },
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      nodes: [{ mesh: 0 }],
      scenes: [{ nodes: [0] }],
      scene: 0,
    },
    binary,
  );
  await page
    .locator('input[accept=".glb"]')
    .setInputFiles({
      name: "fixture.glb",
      mimeType: "model/gltf-binary",
      buffer: bytes,
    });
  await expect(
    page.getByTestId("model-preview").locator("canvas"),
  ).toBeVisible();
  await expect(page.getByTestId("store-canvas")).toHaveAttribute(
    "data-displayed-products",
    "21",
  );
  expect(errors).toEqual([]);
});
