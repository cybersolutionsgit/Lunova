import { Component, Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { AnimationMixer, MathUtils } from "three";
export const JEANS_MODEL_ID = "d81314a29e3943d88a6ee1426021a177";
export const shopperAsset = (detail) =>
  `/models/sketchfab/${JEANS_MODEL_ID}/${detail ? "shopper" : "shopper-low"}.glb`;
const noRaycast = () => null;
class AssetBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function Character({ detail, motion, personId }) {
  const { gl } = useThree(),
    key = personId === "shopper-rose" ? "npcRoseModel" : "npcBlueModel";
  const { scene, animations } = useGLTF(shopperAsset(detail), false, false);
  const copy = useMemo(() => {
    const instance = clone(scene);
    instance.traverse((o) => {
      if (o.isMesh) {
        o.raycast = noRaycast;
        o.castShadow = detail;
        o.frustumCulled = false;
      }
    });
    return instance;
  }, [scene, detail]);
  const mixer = useMemo(() => new AnimationMixer(copy), [copy]),
    weight = useRef(0);
  const actionRef = useRef(null);
  const clip = useMemo(() => {
    const found = animations.find((c) => c.name === "Walk");
    if (!found) throw new Error("Walking clip missing");
    return found;
  }, [animations]);
  useEffect(() => {
    // Create a fresh action after each setup: Strict Mode replays effect cleanup.
    const action = mixer.clipAction(clip);
    actionRef.current = action;
    action.play();
    gl.domElement.dataset[key] = "loaded";
    gl.domElement.dataset.npcModelId = JEANS_MODEL_ID;
    return () => {
      actionRef.current = null;
      mixer.stopAllAction();
      mixer.uncacheRoot(copy);
      delete gl.domElement.dataset[key];
    };
  }, [gl, key, clip, mixer, copy]);
  useFrame((_, dt) => {
    const state = motion.current,
      action = actionRef.current;
    if (state.paused || !action) return;
    weight.current = state.animate
      ? MathUtils.damp(
          weight.current,
          state.walking ? 1 : 0,
          10,
          Math.min(dt, 0.25),
        )
      : 0;
    action.enabled = true;
    action.setEffectiveWeight(weight.current);
    action.time = (state.distance / 0.72) % action.getClip().duration;
    mixer.update(0);
    if (personId === "shopper-rose")
      gl.domElement.dataset.npcWalkWeight = weight.current.toFixed(2);
  }, -0.5);
  return <primitive object={copy} dispose={null} />;
}
export default function ImportedShopper({
  detail,
  motion,
  personId,
  fallback,
}) {
  const { gl } = useThree();
  const key = personId === "shopper-rose" ? "npcRoseModel" : "npcBlueModel";
  return (
    <AssetBoundary
      key={shopperAsset(detail)}
      fallback={fallback}
      onFailure={() => {
        gl.domElement.dataset[key] = "fallback";
      }}
    >
      <Suspense fallback={fallback}>
        <Character detail={detail} motion={motion} personId={personId} />
      </Suspense>
    </AssetBoundary>
  );
}
