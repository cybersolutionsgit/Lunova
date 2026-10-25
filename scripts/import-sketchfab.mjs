import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  readdir,
  lstat,
  cp,
  rm,
} from "node:fs/promises";
import { resolve, dirname, relative, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { uid, creditText, commercialLicense } from "../src/lib/sketchfab.js";
import {
  inspectGltf,
  resourcePath,
  MAX_MODEL_BYTES,
} from "../src/lib/gltf-import.js";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export async function importSketchfab(
  source,
  metadataPath,
  outputRoot = join(root, "public/models/sketchfab"),
) {
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  uid(metadata.uid);
  if (
    metadata.downloadAuthorization !== "official-download-api" ||
    metadata.commercialImportAllowed !== true ||
    !commercialLicense(metadata.license || {}) ||
    !metadata.creator?.name ||
    !/^https:\/\/sketchfab\.com\//.test(metadata.creator?.url || "") ||
    !/^https:\/\/creativecommons\.org\//.test(metadata.license?.url || "")
  )
    throw new Error(
      "Use the creator-credits JSON from an authorized Sketchfab download.",
    );
  metadata.source = "https://sketchfab.com/3d-models/" + metadata.uid;
  const scratch = await mkdtemp(join(tmpdir(), "lunova-model-"));
  try {
    let directory = resolve(source);
    const info = await lstat(directory);
    if (info.isSymbolicLink())
      throw new Error("Model sources cannot be symbolic links.");
    if (info.isFile() && info.size > MAX_MODEL_BYTES * 2)
      throw new Error("Archive is too large.");
    if (info.isFile()) {
      if (extname(source).toLowerCase() === ".zip") {
        execFileSync(
          "python3",
          [join(root, "scripts/unpack-model.py"), directory, scratch],
          { stdio: "pipe" },
        );
        directory = scratch;
      } else {
        await cp(directory, join(scratch, source.split("/").pop()));
        directory = scratch;
      }
    }
    const files = [];
    async function walk(dir) {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (files.length > 100) throw new Error("Too many model resources.");
        const path = join(dir, entry.name);
        if (entry.isSymbolicLink())
          throw new Error("Model resources cannot contain symbolic links.");
        if (entry.isDirectory()) await walk(path);
        else if (entry.isFile()) files.push(path);
      }
    }
    await walk(directory);
    const names = files.map((f) =>
        resourcePath(relative(directory, f).split("\\").join("/")),
      ),
      models = names.filter((n) => /\.(glb|gltf)$/i.test(n));
    if (models.length !== 1)
      throw new Error("The archive must contain exactly one GLB or glTF.");
    if (
      files.some(
        (f) =>
          ![
            ".glb",
            ".gltf",
            ".bin",
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
            ".txt",
          ].includes(extname(f).toLowerCase()),
      )
    )
      throw new Error("Unsupported resource type.");
    const total = (await Promise.all(files.map((f) => lstat(f)))).reduce(
      (n, s) => n + s.size,
      0,
    );
    if (total > MAX_MODEL_BYTES)
      throw new Error("Optimize the complete model below 25 MB.");
    const model = models[0],
      bytes = await readFile(join(directory, model)),
      report = inspectGltf(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
        model,
      );
    const base = model.slice(0, model.lastIndexOf("/") + 1);
    for (const resource of report.resources)
      if (!names.includes(base + resource))
        throw new Error("Missing model resource: " + resource);
    const destination = join(outputRoot, metadata.uid);
    await mkdir(outputRoot, { recursive: true });
    let manifest = [];
    try {
      manifest = JSON.parse(
        await readFile(join(outputRoot, "index.json"), "utf8"),
      );
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    await mkdir(destination); // Deliberately refuse to overwrite an existing asset.
    try {
      for (const name of names) {
        await mkdir(dirname(join(destination, name)), { recursive: true });
        await cp(join(directory, name), join(destination, name));
      }
      const record = {
        uid: metadata.uid,
        name: String(metadata.name || "Untitled model").slice(0, 180),
        source: metadata.source,
        creator: { name: metadata.creator.name, url: metadata.creator.url },
        license: {
          code: metadata.license.code,
          name: metadata.license.name,
          url: metadata.license.url,
        },
        downloadAuthorization: "official-download-api",
        retrievedAt: metadata.retrievedAt || null,
        asset: `/models/sketchfab/${metadata.uid}/${model}`,
        attribution: creditText(metadata),
        importedAt: new Date().toISOString(),
        modifications:
          "No artistic changes. Runtime scale/placement may change; review before publication.",
      };
      await writeFile(
        join(destination, "attribution.json"),
        JSON.stringify(record, null, 2) + "\n",
      );
      await writeFile(
        join(destination, "credits.txt"),
        record.attribution + "\n" + record.modifications + "\n",
      );
      await writeFile(
        join(outputRoot, "index.json"),
        JSON.stringify([...manifest, record], null, 2) + "\n",
      );
      return record;
    } catch (e) {
      await rm(destination, { recursive: true, force: true });
      throw e;
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [source, metadata] = process.argv.slice(2);
  if (!source || !metadata) {
    console.error(
      "Usage: npm run models:import -- <official-archive.zip|model.glb|folder> <creator-credits.json>",
    );
    process.exitCode = 1;
  } else
    try {
      const model = await importSketchfab(source, metadata);
      console.log(
        "Imported for review: " + model.asset + "\n" + model.attribution,
      );
    } catch (e) {
      console.error(e.message);
      process.exitCode = 1;
    }
}
