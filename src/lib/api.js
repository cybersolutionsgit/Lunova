export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "The CMS server is not available yet. Complete the Cloudflare CMS setup first.",
    );
  }
  if (!response.ok) {
    const e = new Error(result.error || "Could not complete the request.");
    e.status = response.status;
    throw e;
  }
  return result;
}
