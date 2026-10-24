import { expect } from "@playwright/test";
import { defaultCatalog } from "../../../src/lib/products.js";
import { defaultSettings } from "../../../src/lib/shop.js";
export const TEST_USERNAME = "fixture-admin",
  TEST_PASSWORD = "fixture-password-for-browser-tests";
export async function mockCms(
  page,
  {
    catalog = defaultCatalog,
    settings = defaultSettings,
    authenticated = false,
  } = {},
) {
  let state = {
    catalog: structuredClone(catalog),
    settings: structuredClone(settings),
    revision: 0,
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    const respond = (json, status = 200) => route.fulfill({ json, status });
    if (path === "/api/store") return respond({ ...state, configured: true });
    if (path === "/api/admin/session")
      return respond({ authenticated, configured: true });
    if (path === "/api/admin/login") {
      const data = request.postDataJSON();
      if (data.username !== TEST_USERNAME || data.password !== TEST_PASSWORD)
        return respond({ error: "Invalid username or password." }, 401);
      authenticated = true;
      return respond({ authenticated: true });
    }
    if (path === "/api/admin/logout") {
      authenticated = false;
      return respond({ authenticated: false });
    }
    if (path === "/api/admin/store") {
      if (!authenticated)
        return respond({ error: "Please log in as the administrator." }, 401);
      if (request.method() === "PUT") {
        const data = request.postDataJSON();
        if (data.revision !== state.revision)
          return respond(
            {
              error:
                "The store changed in another session. Reload before saving.",
            },
            409,
          );
        state = {
          catalog: data.catalog,
          settings: data.settings,
          revision: state.revision + 1,
        };
      }
      return respond(state);
    }
    return respond({ error: "Not found." }, 404);
  });
}
export async function openAdmin(page) {
  await page
    .getByRole("button", { name: "Open store sidebar", exact: true })
    .click();
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    /Store administrator|Store & theme/,
  );
  if (await page.getByLabel("Username", { exact: true }).isVisible()) {
    await page.getByLabel("Username", { exact: true }).fill(TEST_USERNAME);
    await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
  }
  await expect(
    page.getByRole("button", { name: "Store & theme", exact: true }),
  ).toBeVisible();
}
