import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
function dispose(scene) {
  scene?.traverse((object) => {
    object.geometry?.dispose();
    const materials = object.material
      ? Array.isArray(object.material)
        ? object.material
        : [object.material]
      : [];
    for (const material of materials) {
      for (const value of Object.values(material))
        if (value?.isTexture) value.dispose();
      material.dispose();
    }
  });
}
export default function GeneratedProductModel({ url, type, fallback }) {
  const [model, setModel] = useState(null);
  const { gl } = useThree();
  useEffect(() => {
    if (!model) return;
    const canvas = gl.domElement;
    canvas.dataset.modelsLoaded = String(
      Number(canvas.dataset.modelsLoaded || 0) + 1,
    );
    return () => {
      canvas.dataset.modelsLoaded = String(
        Math.max(0, Number(canvas.dataset.modelsLoaded || 0) - 1),
      );
    };
  }, [model, gl]);
  useEffect(() => {
    let cancelled = false,
      scene;
    const controller = new AbortController();
    setModel(null);
    (async () => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Model unavailable");
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 4 * 1024 * 1024)
        throw new Error("Model too large");
      const gltf = await new GLTFLoader().parseAsync(buffer, "");
      scene = gltf.scene;
      if (cancelled) {
        dispose(scene);
        return;
      }
      const bounds = new THREE.Box3().setFromObject(scene),
        size = bounds.getSize(new THREE.Vector3());
      if (
        !Number.isFinite(size.length()) ||
        Math.max(size.x, size.y, size.z) === 0
      )
        throw new Error("Empty model");
      const counter = ["bakery", "beauty", "jewelry", "electronics"].includes(
        type,
      );
      const scale = Math.min(
        1.8 / (size.x || 1),
        (counter ? 0.7 : 2.4) / (size.y || 1),
        0.85 / (size.z || 1),
      );
      const centre = bounds.getCenter(new THREE.Vector3());
      scene.scale.setScalar(scale);
      scene.position.set(
        -centre.x * scale,
        (counter ? 0.9 : 0.16) - bounds.min.y * scale,
        -centre.z * scale,
      );
      scene.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      setModel(scene);
    })().catch(() => {
      dispose(scene);
    });
    return () => {
      cancelled = true;
      controller.abort();
      dispose(scene);
    };
  }, [url, type]);
  return model ? <primitive object={model} /> : fallback;
}
