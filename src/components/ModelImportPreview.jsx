import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { inspectGltf, resourcePath, MAX_MODEL_BYTES } from "../lib/gltf-import";
function dispose(scene) {
  const textures = new Set();
  scene.traverse((o) => {
    o.geometry?.dispose();
    for (const m of (Array.isArray(o.material)
      ? o.material
      : [o.material]
    ).filter(Boolean)) {
      for (const value of Object.values(m))
        if (value?.isTexture) textures.add(value);
      m.dispose();
    }
  });
  textures.forEach((t) => t.dispose());
}
async function parseFiles(files) {
  if (!files.length || files.length > 100)
    throw new Error("Choose one model and at most 99 supporting files.");
  if (files.reduce((n, f) => n + f.size, 0) > MAX_MODEL_BYTES)
    throw new Error("Keep the full model and textures below 25 MB.");
  const entries = new Map(
    files.map((f) => [resourcePath(f.webkitRelativePath || f.name), f]),
  );
  const models = [...entries.keys()].filter((name) =>
    /\.(glb|gltf)$/i.test(name),
  );
  if (models.length !== 1)
    throw new Error(
      "Select exactly one GLB or glTF, with its textures and buffers.",
    );
  const name = models[0],
    prefix = name.slice(0, name.lastIndexOf("/") + 1),
    bytes = await entries.get(name).arrayBuffer();
  const { resources } = inspectGltf(bytes, name);
  for (const resource of resources)
    if (!entries.has(prefix + resource))
      throw new Error("Missing local resource: " + resource);
  const urls = new Map(
    [...entries].map(([n, f]) => [n, URL.createObjectURL(f)]),
  );
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((value) => {
    if (value.startsWith("data:") || [...urls.values()].includes(value))
      return value;
    const url = new URL(value, "https://local-model.invalid/");
    if (url.origin !== "https://local-model.invalid")
      throw new Error("External model resources are blocked.");
    const local = resourcePath(url.pathname.slice(1)),
      target = urls.get(local);
    if (!target) throw new Error("Missing local model resource.");
    return target;
  });
  try {
    const result = await new GLTFLoader(manager).parseAsync(
      bytes,
      "https://local-model.invalid/" + prefix,
    );
    const bounds = new THREE.Box3().setFromObject(result.scene),
      size = bounds.getSize(new THREE.Vector3()),
      center = bounds.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size.length()) || size.length() === 0)
      throw new Error("The model has no visible geometry.");
    const scale = 2 / Math.max(size.x, size.y, size.z);
    result.scene.position.sub(center);
    const group = new THREE.Group();
    group.add(result.scene);
    group.scale.setScalar(scale);
    return group;
  } finally {
    for (const value of urls.values()) URL.revokeObjectURL(value);
  }
}
export default function ModelImportPreview() {
  const [model, setModel] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const current = useRef(null),
    generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      if (current.current) dispose(current.current);
    },
    [],
  );
  async function load(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const ticket = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const next = await parseFiles(files);
      if (ticket !== generation.current) {
        dispose(next);
        return;
      }
      if (current.current) dispose(current.current);
      current.current = next;
      setModel(next);
    } catch (e) {
      if (ticket === generation.current) setError(e.message);
    } finally {
      if (ticket === generation.current) setBusy(false);
      event.target.value = "";
    }
  }
  return (
    <section className="model-import-preview">
      <h3>Preview a local GLB / glTF</h3>
      <p>
        Choose a GLB file, or a folder containing one glTF and its textures.
        This stays in your browser and does not publish or replace store
        displays.
      </p>
      <label className="secondary-button">
        Choose GLB
        <input type="file" accept=".glb" onChange={load} disabled={busy} />
      </label>
      <label className="secondary-button">
        Choose glTF folder
        <input
          type="file"
          webkitdirectory=""
          multiple
          onChange={load}
          disabled={busy}
        />
      </label>
      {busy && <p role="status">Reading local model…</p>}
      {error && (
        <p role="alert" className="editor-error">
          {error}
        </p>
      )}
      {model && (
        <div style={{ height: 320 }} data-testid="model-preview">
          <Canvas camera={{ position: [3, 2, 4], fov: 40 }} dpr={1}>
            <color attach="background" args={["#eee5dc"]} />
            <ambientLight intensity={1.5} />
            <directionalLight position={[3, 5, 3]} intensity={2} />
            <primitive object={model} />
            <OrbitControls makeDefault enablePan={false} />
          </Canvas>
        </div>
      )}
    </section>
  );
}
