import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useWorld, useCatalog } from "../lib/store";
import { activeVisitors } from "../lib/visitors";
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
function Person({ person, index, animate }) {
  const head = useRef(),
    arm = useRef();
  const { skin, hair, outfit, staff } = person;
  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.elapsedTime + index * 2.4;
    head.current.rotation.y = Math.sin(t * 0.4) * 0.13;
    head.current.rotation.x = Math.sin(t * 0.6) * 0.035;
    arm.current.rotation.x = -0.22 + Math.sin(t * 0.7) * 0.055;
  });
  return (
    <group position={person.position} rotation={[0, person.rotation, 0]}>
      {[-0.115, 0.115].map((x) => (
        <group key={x}>
          <Part
            position={[x, 0.42, 0]}
            size={[0.085, 0.52]}
            color="#35343c"
            round
          />
          <Part
            position={[x, 0.08, 0.065]}
            size={[0.19, 0.12, 0.32]}
            color="#302926"
          />
        </group>
      ))}
      <mesh position={[0, 1.02, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.23, 0.19, 0.59, 10]} />
        <meshStandardMaterial color={outfit} roughness={0.9} />
      </mesh>
      <Part position={[0, 1.31, 0]} size={[0.07, 0.09]} color={skin} round />
      <group ref={head} position={[0, 1.55, 0]}>
        <mesh scale={[0.17, 0.215, 0.16]} raycast={noRaycast}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color={skin} roughness={0.85} />
        </mesh>
        <mesh
          position={[0, 0.055, -0.025]}
          scale={[0.177, 0.18, 0.15]}
          raycast={noRaycast}
        >
          <sphereGeometry
            args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.65]}
          />
          <meshStandardMaterial color={hair} roughness={1} />
        </mesh>
        {[-0.063, 0.063].map((x) => (
          <Part
            key={x}
            position={[x, 0.025, 0.148]}
            size={[0.023, 0.016, 0.012]}
            color="#292322"
          />
        ))}
        <Part
          position={[0, -0.025, 0.16]}
          size={[0.025, 0.025]}
          color={skin}
          round
        />
        <Part
          position={[0, -0.087, 0.148]}
          size={[0.05, 0.009, 0.012]}
          color="#815044"
        />
      </group>
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * 0.28, 1.22, 0]}
          rotation={[staff ? -0.35 : -0.12, 0, side * 0.08]}
        >
          <Part
            position={[0, -0.11, 0]}
            size={[0.069, 0.18]}
            color={outfit}
            round
          />
          <group
            ref={side === 1 ? arm : undefined}
            position={[0, -0.26, 0]}
            rotation={[-0.22, 0, 0]}
          >
            <Part
              position={[0, -0.12, 0]}
              size={[0.052, 0.17]}
              color={skin}
              round
            />
            <Part
              position={[0, -0.255, 0]}
              size={[0.058, 0.035]}
              color={skin}
              round
            />
          </group>
        </group>
      ))}
      {staff ? (
        <>
          <Part
            position={[0, 1.07, 0.211]}
            size={[0.32, 0.46, 0.025]}
            color="#e6d6bf"
          />
          <Part
            position={[0.12, 1.23, 0.218]}
            size={[0.1, 0.055, 0.012]}
            color="#fff4dd"
          />
          <Part
            position={[0, 0.95, 0.235]}
            size={[0.2, 0.11, 0.012]}
            color={outfit}
          />
        </>
      ) : (
        <group position={[-0.3, 0.48, 0.045]}>
          <Part
            position={[0, 0, 0]}
            size={[0.29, 0.27, 0.17]}
            color="#c3a37a"
          />
          {[-0.1, 0.1].map((x) => (
            <Part
              key={x}
              position={[x, 0.19, 0]}
              size={[0.015, 0.14, 0.015]}
              color="#715b45"
            />
          ))}
          <Part
            position={[0, 0.26, 0]}
            size={[0.2, 0.015, 0.015]}
            color="#715b45"
          />
        </group>
      )}
    </group>
  );
}
export default function StoreVisitors() {
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
    gl.domElement.dataset.npcAnimated = String(
      enabled && quality === "high" && !reduced,
    );
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
      {people.map((person, index) => (
        <Person
          key={person.id}
          person={person}
          index={index}
          animate={quality === "high" && !reduced}
        />
      ))}
    </group>
  );
}
