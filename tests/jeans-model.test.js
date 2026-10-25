import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { inspectGltf } from "../src/lib/gltf-import.js";
const id = "d81314a29e3943d88a6ee1426021a177",
  dir = "public/models/sketchfab/" + id;
test("both local shopper variants include a skeleton, walking clip and embedded textures within device budgets", async () => {
  for (const [name, limit, triangles] of [
    ["shopper-push", 5 * 1024 * 1024, 65000],
    ["shopper-push-low", 2 * 1024 * 1024, 25000],
  ]) {
    const bytes = await readFile(dir + "/" + name + ".glb");
    assert.ok(bytes.length < limit);
    const report = inspectGltf(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
        name + ".glb",
      ),
      d = report.document;
    assert.match(d.asset.copyright, /Grauwolf.*CC BY/);
    assert.equal(d.skins.length, 1);
    assert.ok(d.skins[0].joints.length >= 7);
    assert.ok(
      d.animations.find((a) => a.name === "Walk")?.channels.length >= 7,
    );
    assert.deepEqual(report.resources, []);
    const count = d.meshes
      .flatMap((m) => m.primitives)
      .reduce((sum, p) => sum + d.accessors[p.indices].count / 3, 0);
    assert.ok(count <= triangles);
    assert.ok(d.images.length >= 1);
    assert.ok(
      d.images.every((image) => image.bufferView !== undefined && !image.uri),
    );
  }
});
test("the user-supplied official download retains creator, CC BY license and modification records", async () => {
  const record = JSON.parse(await readFile(dir + "/attribution.json", "utf8"));
  assert.equal(record.uid, id);
  assert.equal(record.creator.name, "Grauwolf");
  assert.equal(record.license.code, "by");
  assert.equal(record.downloadAuthorization, "official-sketchfab-download");
  assert.match(record.sourceArchiveSha256, /^[a-f0-9]{64}$/);
  assert.match(record.modifications, /skeleton.*walking/);
  assert.match(await readFile(dir + "/credits.txt", "utf8"), /Grauwolf/);
  assert.ok((await stat("public" + record.lowAsset)).size < 2 * 1024 * 1024);
  const credits = await readFile("public/models/credits.html", "utf8");
  assert.match(credits, /creativecommons.org\/licenses\/by\/4.0/);
  assert.match(credits, new RegExp(id));
});

test("both quality variants put geometry at the two trolley grip positions", async () => {
  const { GLTFLoader } =
    await import("three/examples/jsm/loaders/GLTFLoader.js");
  const { Texture, Vector3 } = await import("three");
  for (const name of ["shopper-push", "shopper-push-low"]) {
    const bytes = await readFile(dir + "/" + name + ".glb");
    const loader = new GLTFLoader();
    loader.register(() => ({
      name: "GeometryOnlyTest",
      loadTexture: () => Promise.resolve(new Texture()),
    }));
    const { scene } = await loader.parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
    scene.updateMatrixWorld(true);
    const targets = [
        new Vector3(-0.205, 1.04, 0.28),
        new Vector3(0.205, 1.04, 0.28),
      ],
      nearest = [Infinity, Infinity],
      point = new Vector3();
    scene.traverse((mesh) => {
      if (!mesh.isSkinnedMesh) return;
      mesh.skeleton.update();
      for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
        mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
        targets.forEach((target, j) => {
          nearest[j] = Math.min(nearest[j], point.distanceTo(target));
        });
      }
    });
    for (const distance of nearest)
      assert.ok(
        distance < 0.065,
        `${name} hand is too far from trolley handle: ${distance}`,
      );
  }
});
