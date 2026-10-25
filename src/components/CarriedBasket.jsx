import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useCart, useCatalog, useWorld } from "../lib/store";
function Part({ position, size, color, rotation }) {
  return (
    <mesh position={position} rotation={rotation} renderOrder={100}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.65}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
export default function CarriedBasket() {
  const group = useRef(),
    last = useRef(new THREE.Vector3()),
    sway = useRef(0),
    phase = useRef(0);
  const { camera, gl, size } = useThree();
  const items = useCart((s) => s.items),
    products = useCatalog((s) => s.products),
    theme = useCatalog((s) => s.settings.theme),
    quality = useWorld((s) => s.quality);
  const count = Object.values(items).reduce((total, q) => total + q, 0);
  const contents = products.filter((p) => items[p.id] > 0).slice(0, 4);
  const offset = useMemo(() => new THREE.Vector3(), []);
  const handle = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.22, 0.03, 0),
        new THREE.Vector3(0, 0.43, 0),
        new THREE.Vector3(0.22, 0.03, 0),
      ),
    [],
  );
  const reduced = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  useEffect(() => {
    gl.domElement.dataset.basketCount = String(count);
    gl.domElement.dataset.basketVisible = "true";
    return () => {
      delete gl.domElement.dataset.basketCount;
      delete gl.domElement.dataset.basketVisible;
    };
  }, [gl, count]);
  useFrame((_, dt) => {
    const mobile = size.width / size.height < 0.8;
    const moving = last.current.distanceToSquared(camera.position) > 0.00001;
    sway.current = THREE.MathUtils.damp(
      sway.current,
      moving && !reduced ? 1 : 0,
      8,
      dt,
    );
    phase.current += dt * 7;
    offset
      .set(
        mobile ? 0.12 : 0.48,
        -0.61 + Math.sin(phase.current) * 0.012 * sway.current,
        -1.05,
      )
      .applyQuaternion(camera.quaternion);
    group.current.position.copy(camera.position).add(offset);
    group.current.quaternion.copy(camera.quaternion);
    group.current.scale.setScalar(mobile ? 0.72 : 1);
    last.current.copy(camera.position);
  });
  const bars =
    quality === "high" ? [-0.22, -0.11, 0, 0.11, 0.22] : [-0.22, 0, 0.22];
  return (
    <group ref={group} renderOrder={100}>
      <Part
        position={[0, -0.16, 0]}
        size={[0.44, 0.025, 0.3]}
        color={theme.surface}
      />
      {[-0.16, 0.16].map((z) => (
        <group key={z}>
          <Part
            position={[0, 0.045, z]}
            size={[0.51, 0.035, 0.025]}
            color={theme.metal}
          />
          {bars.map((x) => (
            <Part
              key={x}
              position={[x, -0.06, z]}
              size={[0.018, 0.2, 0.018]}
              color={theme.metal}
            />
          ))}
        </group>
      ))}
      {[-0.25, 0.25].map((x) => (
        <group key={x}>
          <Part
            position={[x, 0.045, 0]}
            size={[0.025, 0.035, 0.34]}
            color={theme.metal}
          />
          {[-0.1, 0, 0.1].map((z) => (
            <Part
              key={z}
              position={[x, -0.06, z]}
              size={[0.018, 0.2, 0.018]}
              color={theme.metal}
            />
          ))}
        </group>
      ))}
      <mesh renderOrder={101}>
        <tubeGeometry args={[handle, 16, 0.014, 6, false]} />
        <meshStandardMaterial
          color={theme.metal}
          metalness={0.5}
          roughness={0.3}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      {contents.map((p, i) => (
        <Part
          key={p.id}
          position={[
            -0.14 + (i % 2) * 0.24,
            -0.08 + Math.floor(i / 2) * 0.06,
            -0.06 + (i % 2) * 0.1,
          ]}
          size={[0.16, 0.13, 0.14]}
          color={p.color}
          rotation={[0, i * 0.3, 0]}
        />
      ))}
      <mesh
        position={[0.33, 0.03, 0.04]}
        rotation={[0, 0, 0.95]}
        renderOrder={102}
      >
        <capsuleGeometry args={[0.043, 0.32, 3, 8]} />
        <meshStandardMaterial
          color="#bc8d70"
          roughness={0.8}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[0.46, -0.09, 0.04]}
        rotation={[0, 0, 0.95]}
        renderOrder={102}
      >
        <capsuleGeometry args={[0.06, 0.15, 3, 8]} />
        <meshStandardMaterial
          color={theme.primary}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[0.19, 0.16, 0.025]}
        scale={[0.06, 0.045, 0.055]}
        renderOrder={103}
      >
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial
          color="#bc8d70"
          roughness={0.8}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
