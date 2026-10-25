import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  sampleVisitor,
  trolleyPosition,
  visitorMustYield,
  visitorPoses,
} from "../lib/visitors";
const noRaycast = () => null;
const Y = new THREE.Vector3(0, 1, 0);
function Shape({
  position,
  scale,
  color,
  kind = "sphere",
  rotation,
  metal = false,
  map,
}) {
  return (
    <mesh
      position={position}
      scale={scale}
      rotation={rotation}
      raycast={noRaycast}
    >
      {kind === "box" ? (
        <boxGeometry />
      ) : kind === "capsule" ? (
        <capsuleGeometry args={[1, 1, 4, 12]} />
      ) : (
        <sphereGeometry args={[1, 20, 14]} />
      )}
      <meshStandardMaterial
        color={color}
        map={map}
        roughness={metal ? 0.25 : 0.82}
        metalness={metal ? 0.8 : 0}
      />
    </mesh>
  );
}
function Rod({ a, b, r = 0.015, color = "#a5aaab", metal = true }) {
  const { position, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
      delta = end.clone().sub(start);
    return {
      position: start.add(end).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        Y,
        delta.clone().normalize(),
      ),
      length: delta.length(),
    };
  }, [...a, ...b]);
  return (
    <mesh position={position} quaternion={quaternion} raycast={noRaycast}>
      <cylinderGeometry args={[r, r, length, 8]} />
      <meshStandardMaterial
        color={color}
        roughness={metal ? 0.25 : 0.8}
        metalness={metal ? 0.8 : 0}
      />
    </mesh>
  );
}
function Trolley({ detail, wheels }) {
  const wires = useMemo(() => {
    const points = [];
    const add = (a, b) => points.push(...a, ...b);
    const n = detail ? 10 : 5;
    for (let i = 0; i <= n; i++) {
      const z = -0.4 + (i * 0.8) / n;
      for (const side of [-1, 1])
        add([side * 0.24, 0.48, z * 0.85], [side * 0.31, 0.86, z]);
      const x = -0.3 + (i * 0.6) / n;
      for (const end of [-1, 1])
        add([x * 0.8, 0.48, end * 0.34], [x, 0.86, end * 0.4]);
    }
    for (const y of [0.58, 0.7, 0.82]) {
      const f = (y - 0.48) / 0.38,
        w = 0.24 + f * 0.07,
        d = 0.34 + f * 0.06;
      add([-w, y, -d], [w, y, -d]);
      add([-w, y, d], [w, y, d]);
      add([-w, y, -d], [-w, y, d]);
      add([w, y, -d], [w, y, d]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return g;
  }, [detail]);
  useEffect(() => () => wires.dispose(), [wires]);
  return (
    <group position={[0, 0, 0.86]}>
      <lineSegments geometry={wires} raycast={noRaycast}>
        <lineBasicMaterial color="#929a9c" />
      </lineSegments>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Rod a={[side * 0.28, 0.2, -0.34]} b={[side * 0.28, 0.2, 0.34]} />
          <Rod a={[side * 0.28, 0.2, -0.34]} b={[side * 0.3, 0.86, -0.4]} />
          <Rod a={[side * 0.28, 0.2, 0.34]} b={[side * 0.3, 0.86, 0.4]} />
          <Rod a={[side * 0.31, 0.86, -0.4]} b={[side * 0.31, 0.86, 0.4]} />
          <Rod a={[side * 0.29, 0.78, -0.4]} b={[side * 0.27, 1.04, -0.43]} />
          {[-0.32, 0.32].map((z, i) => (
            <group key={z} position={[side * 0.28, 0.105, z]}>
              <Shape
                position={[0, 0.085, 0]}
                scale={[0.025, 0.065, 0.025]}
                kind="box"
                color="#7a8083"
                metal
              />
              <group
                ref={(el) => {
                  if (el) wheels.current[(side === -1 ? 0 : 2) + i] = el;
                }}
              >
                <mesh rotation={[0, 0, Math.PI / 2]} raycast={noRaycast}>
                  <cylinderGeometry args={[0.085, 0.085, 0.045, 16]} />
                  <meshStandardMaterial color="#292c30" roughness={0.85} />
                </mesh>
                <Shape scale={[0.027, 0.035, 0.035]} color="#aab0b1" metal />
              </group>
            </group>
          ))}
        </group>
      ))}
      {[-0.4, 0.4].map((z) => (
        <Rod key={z} a={[-0.31, 0.86, z]} b={[0.31, 0.86, z]} />
      ))}
      <Rod
        a={[-0.28, 1.04, -0.43]}
        b={[0.28, 1.04, -0.43]}
        r={0.024}
        color="#655060"
        metal={false}
      />
      <Shape
        position={[0, 0.485, 0]}
        scale={[0.48, 0.015, 0.68]}
        kind="box"
        color="#a9adac"
        metal
      />
      {[-1, 1].map((s, i) => (
        <group key={s} position={[s * 0.115, 0.63, i * 0.16 - 0.08]}>
          <Shape
            scale={[0.19, 0.27, 0.21]}
            kind="box"
            color={i ? "#bf9ba3" : "#ede0ca"}
          />
          <Rod
            a={[-0.05, 0.13, 0]}
            b={[-0.05, 0.21, 0]}
            r={0.008}
            color="#8b7969"
            metal={false}
          />
          <Rod
            a={[0.05, 0.13, 0]}
            b={[0.05, 0.21, 0]}
            r={0.008}
            color="#8b7969"
            metal={false}
          />
          <Rod
            a={[-0.05, 0.21, 0]}
            b={[0.05, 0.21, 0]}
            r={0.008}
            color="#8b7969"
            metal={false}
          />
        </group>
      ))}
    </group>
  );
}
export default function ShopperCharacter({ person, detail, animate, paused }) {
  const root = useRef(),
    head = useRef(),
    legs = useRef([]),
    knees = useRef([]),
    wheels = useRef([]),
    elapsed = useRef(0),
    published = useRef(1);
  const { camera, gl } = useThree();
  const { skin, hair, outfit, staff } = person;
  const blouse = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          [0.17, 1.0],
          [0.15, 1.05],
          [0.16, 1.16],
          [0.205, 1.29],
          [0.205, 1.34],
          [0.13, 1.4],
          [0.07, 1.41],
        ].map((p) => new THREE.Vector2(...p)),
        24,
      ),
    [],
  );
  const skirt = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          [0.24, 0.62],
          [0.25, 0.65],
          [0.22, 0.83],
          [0.17, 1.02],
        ].map((p) => new THREE.Vector2(...p)),
        24,
      ),
    [],
  );
  const fabric = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#eeeeee";
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = "#d4d4d4";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 64; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 64);
      ctx.moveTo(0, i);
      ctx.lineTo(64, i);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(c);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
  useEffect(
    () => () => {
      blouse.dispose();
      skirt.dispose();
      fabric.dispose();
      visitorPoses.delete(person.id);
      delete gl.domElement.dataset[
        person.staff
          ? "npcCashierPose"
          : person.id === "shopper-rose"
            ? "npcShopperPose"
            : "npcSecondPose"
      ];
    },
    [blouse, skirt, fabric, person.id, person.staff, gl],
  );
  useFrame((_, dt) => {
    const step = Math.min(dt, 0.25),
      previous = sampleVisitor(person, elapsed.current);
    let pose = previous;
    if (animate && !paused) {
      const next = sampleVisitor(person, elapsed.current + step);
      if (staff || !visitorMustYield(next, camera)) {
        elapsed.current += step;
        pose = next;
      }
    }
    root.current.position.set(pose.x, 0, pose.z);
    root.current.rotation.y = pose.yaw;
    visitorPoses.set(person.id, pose);
    const moved = Math.hypot(pose.x - previous.x, pose.z - previous.z),
      walking = moved > 0.00001;
    const gait = (pose.distance / 0.72) * Math.PI * 2;
    legs.current.forEach((leg, i) => {
      leg.rotation.x = walking
        ? Math.sin(gait + i * Math.PI) * 0.3
        : THREE.MathUtils.damp(leg.rotation.x, 0, 10, step);
    });
    knees.current.forEach((knee, i) => {
      knee.rotation.x = walking
        ? Math.max(0, Math.sin(gait + i * Math.PI)) * 0.32
        : THREE.MathUtils.damp(knee.rotation.x, 0, 10, step);
    });
    const previousCart = trolleyPosition(previous),
      cart = trolleyPosition(pose);
    const rolled = Math.hypot(cart.x - previousCart.x, cart.z - previousCart.z);
    for (const wheel of wheels.current) wheel.rotation.x += rolled / 0.085;
    head.current.rotation.y =
      animate && !paused && detail ? Math.sin(elapsed.current * 0.5) * 0.1 : 0;
    head.current.rotation.x =
      animate && !paused && detail
        ? Math.sin(elapsed.current * 0.4) * 0.025
        : 0;
    published.current += step;
    if (published.current > 0.2) {
      gl.domElement.dataset[
        staff
          ? "npcCashierPose"
          : person.id === "shopper-rose"
            ? "npcShopperPose"
            : "npcSecondPose"
      ] = JSON.stringify({
        x: +pose.x.toFixed(3),
        z: +pose.z.toFixed(3),
        yaw: +pose.yaw.toFixed(3),
        moving: walking,
      });
      published.current = 0;
    }
  }, -1);
  return (
    <group ref={root}>
      <mesh geometry={blouse} scale={[1, 1, 0.7]} raycast={noRaycast}>
        <meshStandardMaterial color={outfit} map={fabric} roughness={0.92} />
      </mesh>
      <mesh geometry={skirt} scale={[1, 1, 0.78]} raycast={noRaycast}>
        <meshStandardMaterial
          color={staff ? "#303e3a" : "#34313c"}
          map={fabric}
          roughness={0.92}
        />
      </mesh>
      <Shape
        position={[0, 1.02, 0]}
        scale={[0.174, 0.022, 0.122]}
        color="#453d43"
      />
      <Shape
        position={[0, 1.02, 0.126]}
        scale={[0.035, 0.027, 0.009]}
        kind="box"
        color="#c7a569"
        metal
      />
      <Shape
        position={[0, 1.425, 0]}
        scale={[0.052, 0.07, 0.05]}
        color={skin}
      />
      {[-1, 1].map((side, i) => (
        <group key={side}>
          <group
            ref={(el) => {
              if (el) legs.current[i] = el;
            }}
            position={[side * 0.1, 0.715, 0]}
          >
            <Shape
              position={[0, -0.15, 0]}
              scale={[0.062, 0.17, 0.063]}
              color={skin}
            />
            <group
              ref={(el) => {
                if (el) knees.current[i] = el;
              }}
              position={[0, -0.31, 0]}
            >
              <Shape scale={[0.047, 0.047, 0.047]} color={skin} />
              <Shape
                position={[0, -0.15, 0]}
                scale={[0.044, 0.16, 0.046]}
                color={skin}
              />
              <Shape
                position={[0, -0.366, 0.048]}
                scale={[0.074, 0.043, 0.147]}
                color="#302a2d"
              />
              <Shape
                position={[0, -0.393, 0.048]}
                scale={[0.076, 0.012, 0.15]}
                color="#19191c"
              />
            </group>
          </group>
          <Shape
            position={[side * 0.19, 1.33, 0]}
            scale={[0.072, 0.075, 0.066]}
            color={outfit}
            map={fabric}
          />
          <Rod
            a={[side * 0.19, 1.34, 0]}
            b={[side * 0.245, 1.16, 0.12]}
            r={0.061}
            color={outfit}
            metal={false}
          />
          <Shape
            position={[side * 0.245, 1.16, 0.12]}
            scale={[0.047, 0.047, 0.047]}
            color={skin}
          />
          <Rod
            a={[side * 0.245, 1.16, 0.12]}
            b={[side * 0.24, 1.065, staff ? 0.29 : 0.43]}
            r={0.034}
            color={skin}
            metal={false}
          />
          <Shape
            position={[side * 0.24, 1.06, staff ? 0.29 : 0.43]}
            scale={[0.045, 0.03, 0.05]}
            color={skin}
          />
          {detail &&
            [0, 1, 2, 3].map((f) => (
              <Shape
                key={f}
                position={[
                  side * 0.218 + f * 0.012,
                  1.039,
                  staff ? 0.31 : 0.45,
                ]}
                scale={[0.006, 0.018, 0.018]}
                color={skin}
              />
            ))}
        </group>
      ))}
      <group ref={head} position={[0, 1.6, 0]}>
        <Shape scale={[0.112, 0.153, 0.105]} color={skin} />
        <Shape
          position={[0, -0.075, 0.025]}
          scale={[0.084, 0.075, 0.082]}
          color={skin}
        />
        <mesh
          position={[0, 0.025, -0.023]}
          scale={[0.12, 0.149, 0.111]}
          raycast={noRaycast}
        >
          <sphereGeometry
            args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]}
          />
          <meshStandardMaterial color={hair} roughness={0.8} />
        </mesh>
        <Shape
          position={[0, -0.016, -0.1]}
          scale={[0.115, 0.14, 0.05]}
          color={hair}
        />
        <Shape
          position={[0.105, -0.06, -0.005]}
          scale={[0.025, 0.125, 0.034]}
          color={hair}
          rotation={[0, 0, -0.15]}
        />
        <Shape
          position={[-0.105, -0.06, -0.005]}
          scale={[0.025, 0.125, 0.034]}
          color={hair}
          rotation={[0, 0, 0.15]}
        />
        <Shape
          position={[0, -0.08, -0.145]}
          scale={[0.059, 0.15, 0.052]}
          color={hair}
          rotation={[-0.25, 0, 0]}
        />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Shape
              position={[side * 0.112, -0.025, 0]}
              scale={[0.021, 0.034, 0.018]}
              color={skin}
            />
            <Shape
              position={[side * 0.118, -0.06, 0.008]}
              scale={[0.009, 0.015, 0.009]}
              color="#c8ad76"
              metal
            />
            <Shape
              position={[side * 0.044, 0.02, 0.094]}
              scale={[0.028, 0.012, 0.012]}
              color="#f2e6dc"
            />
            <Shape
              position={[side * 0.044, 0.02, 0.104]}
              scale={[0.01, 0.01, 0.004]}
              color="#4b3830"
            />
            <Shape
              position={[side * 0.044, 0.021, 0.108]}
              scale={[0.004, 0.006, 0.002]}
              color="#1e1c1c"
            />
            <Rod
              a={[side * 0.022, 0.048, 0.094]}
              b={[side * 0.066, 0.051, 0.088]}
              r={0.0045}
              color={hair}
              metal={false}
            />
            {detail && (
              <Rod
                a={[side * 0.021, 0.029, 0.104]}
                b={[side * 0.068, 0.03, 0.095]}
                r={0.002}
                color="#423128"
                metal={false}
              />
            )}
          </group>
        ))}
        <Shape
          position={[0, -0.012, 0.108]}
          scale={[0.015, 0.029, 0.019]}
          color={skin}
        />
        <Shape
          position={[0, -0.033, 0.123]}
          scale={[0.018, 0.012, 0.012]}
          color={skin}
        />
        <Shape
          position={[0, -0.066, 0.104]}
          scale={[0.027, 0.008, 0.008]}
          color="#9b5f60"
        />
        <Shape
          position={[0, -0.074, 0.103]}
          scale={[0.023, 0.006, 0.007]}
          color="#b47b73"
        />
      </group>
      {detail && (
        <>
          <Rod
            a={[-0.09, 1.395, 0.05]}
            b={[0, 1.26, 0.15]}
            r={0.004}
            color="#c7ac76"
          />
          <Rod
            a={[0.09, 1.395, 0.05]}
            b={[0, 1.26, 0.15]}
            r={0.004}
            color="#c7ac76"
          />
          <Shape
            position={[0, 1.25, 0.155]}
            scale={[0.012, 0.019, 0.005]}
            color="#c7ac76"
            metal
          />
          {[1.08, 1.16, 1.23].map((y) => (
            <Shape
              key={y}
              position={[0, y, 0.122]}
              scale={[0.006, 0.006, 0.004]}
              color="#ddc9b1"
            />
          ))}
        </>
      )}
      {staff ? (
        <Shape
          position={[0.105, 1.3, 0.12]}
          scale={[0.07, 0.035, 0.01]}
          kind="box"
          color="#f4e7cc"
        />
      ) : (
        <Trolley detail={detail} wheels={wheels} />
      )}
    </group>
  );
}
