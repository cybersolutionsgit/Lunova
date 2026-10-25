import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useWorld, useCatalog } from "../lib/store";
import { activeVisitors } from "../lib/visitors";
import ShopperCharacter from "./ShopperCharacter";
const noRaycast = () => null;
function Part({ position, size, color, rotation, round = false }) {
  return (
    <mesh position={position} rotation={rotation} raycast={noRaycast}>
      {round ? (
        <capsuleGeometry args={[size[0], size[1], 3, 8]} />
      ) : (
        <boxGeometry args={size} />
      )}
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}
export default function StoreVisitors({ paused = false }) {
  const { gl } = useThree();
  const quality = useWorld((s) => s.quality),
    enabled = useWorld((s) => s.visitorsEnabled);
  const theme = useCatalog((s) => s.settings.theme);
  const people = activeVisitors(quality, enabled);
  const reduced = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  useEffect(() => {
    gl.domElement.dataset.npcCount = String(people.length);
    gl.domElement.dataset.npcAnimated = String(enabled && !reduced);
    return () => {
      delete gl.domElement.dataset.npcCount;
      delete gl.domElement.dataset.npcAnimated;
    };
  }, [gl, people.length, enabled, quality, reduced]);
  if (!enabled) return null;
  return (
    <group>
      <group position={[0, 0, -7.5]}>
        <Part
          position={[0, 0.49, 0]}
          size={[2.1, 0.98, 0.68]}
          color={theme.primary}
        />
        <Part
          position={[0, 1.01, 0]}
          size={[2.25, 0.075, 0.82]}
          color={theme.surface}
        />
        <Part
          position={[0, 0.15, 0.35]}
          size={[2.08, 0.065, 0.025]}
          color={theme.metal}
        />
        <Part
          position={[0.5, 1.12, -0.12]}
          size={[0.1, 0.2, 0.1]}
          color="#33343a"
        />
        <Part
          position={[0.5, 1.3, -0.1]}
          size={[0.36, 0.24, 0.035]}
          color="#33343a"
          rotation={[-0.2, 0, 0]}
        />
        <Part
          position={[0.5, 1.3, -0.075]}
          size={[0.3, 0.18, 0.01]}
          color="#b7c9be"
          rotation={[-0.2, 0, 0]}
        />
      </group>
      {people.map((person) => (
        <ShopperCharacter
          key={person.id}
          person={person}
          detail={quality === "high"}
          animate={!reduced}
          paused={paused}
        />
      ))}
    </group>
  );
}
