import { api } from "./api";
export async function imageHash(image) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(image)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function generateProductModel(image, signal) {
  let blob;
  const inline = image.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/,
  );
  if (inline) {
    blob = new Blob(
      [Uint8Array.from(atob(inline[2]), (c) => c.charCodeAt(0))],
      { type: inline[1] },
    );
  } else {
    const response = await fetch(image, { credentials: "omit", signal });
    if (!response.ok)
      throw new Error(
        "Could not read the product photo. Upload the photo directly and try again.",
      );
    blob = await response.blob();
  }
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(blob.type) ||
    blob.size > 10000000
  )
    throw new Error("Choose a JPG, PNG or WebP photo under 10 MB.");
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const result = await api("/api/admin/models/generate", {
    method: "POST",
    body: JSON.stringify({ image: canvas.toDataURL("image/jpeg", 0.82) }),
    signal,
  });
  return { modelUrl: result.modelUrl, modelImageHash: await imageHash(image) };
}
