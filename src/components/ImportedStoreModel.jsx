// Opt-in reviewed assets only. Existing fixture rendering is unchanged.
import { useMemo } from "react";
import { resourcePath } from "../lib/gltf-import";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
export default function ImportedStoreModel({ asset, ...props }) {
  if (
    !/^\/models\/sketchfab\/[a-f0-9]{32}\/[a-zA-Z0-9_./% -]+\.(glb|gltf)$/i.test(
      asset,
    ) ||
    asset.split("/").includes("..")
  )
    throw new Error("Use a reviewed local Sketchfab asset.");
  resourcePath(asset.slice(1));
  const { scene } = useGLTF(asset, false, false);
  const copy = useMemo(() => clone(scene), [scene]);
  return <primitive object={copy} dispose={null} {...props} />;
}
