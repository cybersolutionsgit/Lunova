export const SKETCHFAB_LICENSES = [
  "cc0",
  "by",
  "by-sa",
  "by-nd",
  "by-nc",
  "by-nc-sa",
  "by-nc-nd",
  "free-st",
  "st",
  "ed",
];
export function searchParameters(params) {
  const q = (params.get("q") || "").trim();
  if (!q || q.length > 100)
    throw new Error("Enter a keyword of 1–100 characters.");
  const license = params.get("license") || "",
    availability = params.get("downloadable") || "true";
  if (license && !SKETCHFAB_LICENSES.includes(license))
    throw new Error("Choose a supported license.");
  if (!["true", "false", "all"].includes(availability))
    throw new Error("Choose download availability.");
  const offset = Number(params.get("offset") || 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000)
    throw new Error("Invalid results page.");
  const query = new URLSearchParams({
    type: "models",
    q,
    count: "12",
    offset: String(offset),
  });
  if (license) query.set("license", license);
  if (availability !== "all") query.set("downloadable", availability);
  return query;
}
export function uid(value) {
  if (!/^[a-f0-9]{32}$/.test(value || ""))
    throw new Error("Invalid Sketchfab model ID.");
  return value;
}
function https(value, hosts) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!hosts || hosts.includes(u.hostname))
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export function commercialLicense(license) {
  try {
    const url = new URL(license.url);
    return (
      url.protocol === "https:" &&
      url.hostname === "creativecommons.org" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      (license.code === "cc0"
        ? /^\/publicdomain\/zero\/[0-9.]+\/$/.test(url.pathname)
        : ["by", "by-sa"].includes(license.code) &&
          new RegExp("^/licenses/" + license.code + "/[0-9.]+/$").test(
            url.pathname,
          ))
    );
  } catch {
    return false;
  }
}
export function modelSummary(model, licenses = []) {
  const id = uid(model.uid),
    reference = model.license || {},
    license =
      licenses.find(
        (l) =>
          l.uri?.split("/").pop() === reference.uid ||
          (reference.slug && l.slug === reference.slug),
      ) || reference,
    creator = model.user || {};
  const slug = String(license.slug || "");
  let licenseUrl = license.url || "";
  if (licenseUrl.startsWith("http://creativecommons.org/"))
    licenseUrl = "https:" + licenseUrl.slice(5);
  return {
    uid: id,
    name: String(model.name || "Untitled model").slice(0, 180),
    source: `https://sketchfab.com/3d-models/${id}`,
    creator: {
      name: String(
        creator.displayName || creator.username || "Unknown creator",
      ).slice(0, 120),
      url:
        https(creator.profileUrl, ["sketchfab.com"]) ||
        `https://sketchfab.com/${encodeURIComponent(creator.username || "")}`,
    },
    license: {
      code: slug,
      name: String(
        license.label || license.fullName || slug || "Unspecified",
      ).slice(0, 150),
      url: https(licenseUrl, ["creativecommons.org", "sketchfab.com"]),
    },
    thumbnail: https(
      model.thumbnails?.images?.find((i) => i.width >= 320)?.url ||
        model.thumbnails?.images?.[0]?.url,
    ),
    downloadable: model.isDownloadable === true,
    commercialImportAllowed:
      model.isDownloadable === true &&
      commercialLicense({ code: slug, url: licenseUrl }),
    vertices: Number.isFinite(model.vertexCount) ? model.vertexCount : null,
  };
}
export function creditText(model) {
  return `${model.name} by ${model.creator.name} (${model.creator.url}). Source: ${model.source}. License: ${model.license.name} (${model.license.url}).${model.license.code === "by-sa" ? " Adapted model files must keep the same license." : ""}`;
}
