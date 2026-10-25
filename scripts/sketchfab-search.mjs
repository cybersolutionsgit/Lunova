import { searchParameters, modelSummary } from "../src/lib/sketchfab.js";
const query = searchParameters(
  new URLSearchParams({
    q: process.argv[2] || "supermarket shelf",
    downloadable: "true",
  }),
);
try {
  const response = await fetch("https://api.sketchfab.com/v3/search?" + query, {
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error("Sketchfab returned HTTP " + response.status);
  const data = await response.json();
  const licensesResponse = await fetch(
    "https://api.sketchfab.com/v3/licenses",
    { redirect: "error", signal: AbortSignal.timeout(15000) },
  );
  if (!licensesResponse.ok) throw new Error("License catalog unavailable.");
  const licenses = await licensesResponse.json();
  console.log(
    JSON.stringify(
      {
        query: query.get("q"),
        results: data.results.map((model) =>
          modelSummary(model, licenses.results || []),
        ),
      },
      null,
      2,
    ),
  );
} catch {
  console.error(
    "Live Sketchfab search failed. Check environment network access to api.sketchfab.com; no model was downloaded.",
  );
  process.exitCode = 1;
}
