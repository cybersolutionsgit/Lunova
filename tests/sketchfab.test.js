import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { searchParameters, modelSummary } from "../src/lib/sketchfab.js";
import { inspectGltf, resourcePath } from "../src/lib/gltf-import.js";
import { importSketchfab } from "../scripts/import-sketchfab.mjs";
const id = "a".repeat(32),
  model = {
    uid: id,
    name: "Supermarket shelf",
    isDownloadable: true,
    user: {
      displayName: "Fixture creator",
      username: "fixture-creator",
      profileUrl: "https://sketchfab.com/fixture-creator",
    },
    license: {
      slug: "by",
      label: "CC Attribution",
      url: "https://creativecommons.org/licenses/by/4.0/",
    },
  };
test("developer search validates keyword, license and availability filters", () => {
  const query = searchParameters(
    new URLSearchParams("q=supermarket+shelf&license=by&downloadable=true"),
  );
  assert.equal(query.get("q"), "supermarket shelf");
  assert.equal(query.get("license"), "by");
  assert.equal(query.get("downloadable"), "true");
  assert.throws(() =>
    searchParameters(new URLSearchParams("q=shelf&license=made-up")),
  );
  assert.throws(() =>
    searchParameters(new URLSearchParams("q=shelf&offset=https://evil.test")),
  );
});
test("official license references resolve correctly and restricted models remain excluded", () => {
  const result = modelSummary(
    {
      ...model,
      license: {
        uid: "322a749bcfa841b29dff1e8a1bb74b0b",
        label: "CC Attribution",
      },
    },
    [
      {
        uri: "https://api.sketchfab.com/v3/licenses/322a749bcfa841b29dff1e8a1bb74b0b",
        slug: "by",
        label: "CC Attribution",
        url: "http://creativecommons.org/licenses/by/4.0/",
      },
    ],
  );
  assert.equal(
    result.license.url,
    "https://creativecommons.org/licenses/by/4.0/",
  );
  assert.equal(result.commercialImportAllowed, true);
  assert.equal(
    modelSummary({ ...model, isDownloadable: false }).commercialImportAllowed,
    false,
  );
  assert.equal(
    modelSummary({
      ...model,
      license: { slug: "by-nc", url: model.license.url },
    }).commercialImportAllowed,
    false,
  );
  assert.equal(
    modelSummary({ ...model, license: { label: "Unknown" } })
      .commercialImportAllowed,
    false,
  );
});
test("local glTF inspection rejects remote resources, traversal and oversized geometry", () => {
  for (const path of [
    "https://evil.test/a.bin",
    "../secret.bin",
    "%2e%2e/private",
    "/etc/passwd",
    "a\\b",
  ])
    assert.throws(() => resourcePath(path));
  const bytes = (data) => new TextEncoder().encode(JSON.stringify(data)).buffer;
  assert.throws(() =>
    inspectGltf(
      bytes({
        asset: { version: "2.0" },
        buffers: [{ uri: "https://evil.test/a.bin" }],
      }),
      "scene.gltf",
    ),
  );
  assert.throws(() =>
    inspectGltf(
      bytes({
        asset: { version: "2.0" },
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        accessors: [{ count: 500001 }],
      }),
      "scene.gltf",
    ),
  );
  assert.deepEqual(
    inspectGltf(
      bytes({ asset: { version: "2.0" }, buffers: [{ uri: "buffer.bin" }] }),
      "scene.gltf",
    ).resources,
    ["buffer.bin"],
  );
});
test("build-time imports preserve credits, block external resources and refuse duplicate assets", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "lunova-import-test-"));
  try {
    const source = join(scratch, "input");
    await mkdir(source);
    const file = join(source, "scene.gltf"),
      metadata = join(scratch, "credits.json"),
      output = join(scratch, "output");
    await writeFile(file, JSON.stringify({ asset: { version: "2.0" } }));
    await writeFile(
      metadata,
      JSON.stringify({
        ...modelSummary(model),
        downloadAuthorization: "official-download-api",
      }),
    );
    const record = await importSketchfab(source, metadata, output);
    assert.match(record.asset, /scene.gltf/);
    assert.match(
      await readFile(join(output, id, "credits.txt"), "utf8"),
      /creativecommons.org/,
    );
    assert.equal(
      JSON.parse(await readFile(join(output, "index.json"), "utf8")).length,
      1,
    );
    await assert.rejects(importSketchfab(source, metadata, output));
    await writeFile(
      file,
      JSON.stringify({
        asset: { version: "2.0" },
        images: [{ uri: "https://evil.test/texture.png" }],
      }),
    );
    await assert.rejects(
      importSketchfab(source, metadata, join(scratch, "other")),
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
test("malicious ZIP members cannot write outside the import directory", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "lunova-zip-test-"));
  try {
    const archive = join(scratch, "unsafe.zip");
    execFileSync("python3", [
      "-c",
      'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],"w"); z.writestr("../escape.gltf","{}"); z.close()',
      archive,
    ]);
    const metadata = join(scratch, "credits.json");
    await writeFile(
      metadata,
      JSON.stringify({
        ...modelSummary(model),
        downloadAuthorization: "official-download-api",
      }),
    );
    await assert.rejects(
      importSketchfab(archive, metadata, join(scratch, "out")),
    );
    await assert.rejects(readFile(join(scratch, "escape.gltf")));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
