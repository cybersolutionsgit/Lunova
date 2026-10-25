export const MAX_MODEL_BYTES = 25 * 1024 * 1024;
export function resourcePath(value) {
  const decoded = decodeURIComponent(value);
  if (
    !decoded ||
    /[\\:?#\x00-\x1f]/.test(decoded) ||
    decoded.startsWith("/") ||
    decoded.split("/").some((p) => p === ".." || p === "." || !p)
  )
    throw new Error("Model resources must use local relative file paths.");
  return decoded;
}
export function inspectGltf(bytes, name) {
  if (bytes.byteLength > MAX_MODEL_BYTES)
    throw new Error("Use a model smaller than 25 MB.");
  let document;
  if (name.toLowerCase().endsWith(".glb")) {
    const view = new DataView(bytes);
    if (
      bytes.byteLength < 20 ||
      view.getUint32(0, true) !== 0x46546c67 ||
      view.getUint32(4, true) !== 2 ||
      view.getUint32(8, true) !== bytes.byteLength ||
      view.getUint32(16, true) !== 0x4e4f534a
    )
      throw new Error("Invalid GLB 2.0 file.");
    const length = view.getUint32(12, true);
    if (length + 20 > bytes.byteLength)
      throw new Error("Invalid GLB JSON chunk.");
    document = JSON.parse(
      new TextDecoder()
        .decode(bytes.slice(20, 20 + length))
        .replace(/\0+$/, ""),
    );
  } else if (name.toLowerCase().endsWith(".gltf"))
    document = JSON.parse(new TextDecoder().decode(bytes));
  else throw new Error("Choose a GLB or glTF 2.0 model.");
  if (document.asset?.version !== "2.0")
    throw new Error("Only glTF 2.0 is supported.");
  if (
    (document.extensionsRequired || []).some((e) =>
      [
        "KHR_draco_mesh_compression",
        "KHR_texture_basisu",
        "EXT_meshopt_compression",
      ].includes(e),
    )
  )
    throw new Error(
      "Export an uncompressed glTF/GLB before importing this model.",
    );
  const vertices = (document.meshes || [])
    .flatMap((m) => m.primitives || [])
    .reduce(
      (n, p) => n + (document.accessors?.[p.attributes?.POSITION]?.count || 0),
      0,
    );
  if (vertices > 500000)
    throw new Error(
      "This model is too detailed. Optimize it below 500,000 vertices.",
    );
  const resources = [];
  for (const item of [...(document.buffers || []), ...(document.images || [])])
    if (item.uri) {
      if (
        /^data:(application\/octet-stream|application\/gltf-buffer|image\/(png|jpeg|webp));base64,[a-zA-Z0-9+/=\s]+$/.test(
          item.uri,
        )
      )
        continue;
      resources.push(resourcePath(item.uri));
    }
  return { document, resources, vertices };
}
