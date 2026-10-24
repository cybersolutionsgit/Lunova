import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  Component,
  createContext,
  useContext,
} from "react";
import { Canvas, events, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { products } from "../lib/products";
import { useWorld } from "../lib/store";
import { shelfCenters, movePlayer } from "../lib/world";
import { movement } from "../lib/controls";

function labelTexture(
  text,
  fg = "#2f493e",
  bg = "#f3eedf",
  subtitle = "L U N O V A",
) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);
  ctx.textAlign = "center";
  ctx.fillStyle = fg;
  ctx.font = "600 22px sans-serif";
  ctx.fillText(subtitle, 256, 60);
  ctx.font = `bold ${text.length > 14 ? 32 : 44}px sans-serif`;
  ctx.fillText(text, 256, 140);
  ctx.font = "18px sans-serif";
  ctx.fillText("GOOD THINGS, EVERY DAY", 256, 202);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function Sign({ text, position, width = 3.5, bg, fg }) {
  const map = useMemo(
    () => labelTexture(text, fg, bg, "FIND YOUR EVERYDAY"),
    [text, fg, bg],
  );
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh position={position}>
      <boxGeometry args={[width, 0.85, 0.09]} />
      <meshStandardMaterial color={bg || "#f3eedf"} />
      <mesh position={[0, 0, 0.051]}>
        <planeGeometry args={[width - 0.08, 0.8]} />
        <meshBasicMaterial map={map} />
      </mesh>
    </mesh>
  );
}
function Box({ position, size, color, ...props }) {
  return (
    <mesh position={position} {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
const ProductTextures = createContext({});
function Product({ product, position, scale = 1 }) {
  const select = useWorld((s) => s.select);
  const [hover, setHover] = useState(false);
  const maps = useContext(ProductTextures);
  const map = maps[product.id];
  const bottle = product.shape === "bottle";
  const round = product.shape === "round";
  const loaf = product.shape === "loaf";
  return (
    <group
      position={position}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta < 6) select(product);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "auto";
      }}
    >
      <mesh castShadow scale={hover ? 1.08 : 1}>
        {round ? (
          <sphereGeometry args={[0.24, 12, 10]} />
        ) : bottle ? (
          <cylinderGeometry args={[0.15, 0.19, 0.64, 12]} />
        ) : loaf ? (
          <capsuleGeometry args={[0.18, 0.3, 4, 10]} />
        ) : (
          <boxGeometry
            args={[0.4, product.shape === "carton" ? 0.65 : 0.48, 0.3]}
          />
        )}
        <meshStandardMaterial
          color={product.color}
          roughness={0.7}
          emissive={hover ? "#594b23" : "#000"}
          emissiveIntensity={0.22}
        />
      </mesh>
      {bottle && (
        <Box
          position={[0, 0.39, 0]}
          size={[0.17, 0.16, 0.17]}
          color={product.accent}
        />
      )}
      {round && (
        <Box position={[0, 0.25, 0]} size={[0.05, 0.1, 0.05]} color="#546b3a" />
      )}
      {!round && (
        <mesh position={[0, 0, bottle ? 0.194 : 0.156]}>
          <planeGeometry args={[bottle ? 0.23 : 0.36, 0.26]} />
          <meshStandardMaterial map={map} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
function Shelf({ center, index }) {
  const x = center[0],
    z = center[1];
  const ids =
    index === 0
      ? [0, 1, 0, 1, 2, 3]
      : index === 1
        ? [2, 3, 4, 5, 4, 5]
        : [6, 7, 8, 9, 6, 8];
  return (
    <group position={[x, 0, z]}>
      <Box
        position={[0, 0.16, 0]}
        size={[1.8, 0.32, 7]}
        color="#b9b6a3"
        castShadow
      />
      <Box position={[0, 1.2, 0]} size={[0.12, 2.2, 6.9]} color="#d6d1be" />
      {[-3.4, 3.4].map((v) => (
        <Box
          key={v}
          position={[0, 1.2, v]}
          size={[1.8, 2.3, 0.12]}
          color="#d7d1bd"
        />
      ))}
      {[0.45, 1.1, 1.75].map((y, row) => (
        <group key={y}>
          <Box
            position={[0, y, 0]}
            size={[1.85, 0.09, 7]}
            color="#f3eddd"
            receiveShadow
          />
          {[-1, 1].map((side) => (
            <group key={side}>
              <Box
                position={[side * 0.91, y - 0.025, 0]}
                size={[0.045, 0.14, 6.9]}
                color={
                  index === 0 ? "#728c59" : index === 1 ? "#aa8865" : "#587c75"
                }
              />
              {Array.from({ length: 12 }, (_, i) => {
                const p = products[ids[Math.floor(i / 2)]];
                return (
                  <group
                    key={i}
                    position={[side * 0.55, y + 0.38, -3.05 + i * 0.55]}
                    rotation={[0, side === 1 ? Math.PI / 2 : -Math.PI / 2, 0]}
                  >
                    <Product product={p} scale={row === 2 ? 0.85 : 1} />
                  </group>
                );
              })}
            </group>
          ))}
        </group>
      ))}
      {[0.45, 1.1, 1.75].map((y, row) => (
        <group key={`end-${row}`}>
          <Box
            position={[0, y, 3.62]}
            size={[1.8, 0.08, 0.45]}
            color="#f3eddd"
          />
          {[-0.55, 0, 0.55].map((v, i) => (
            <Product
              key={i}
              product={products[ids[row * 2]]}
              position={[v, y + 0.35, 3.65]}
              scale={0.8}
            />
          ))}
        </group>
      ))}
      <Sign
        text={
          ["01 · Fresh & green", "02 · Daily favorites", "03 · Pantry & sips"][
            index
          ]
        }
        position={[0, 3.25, 3.4]}
        width={2.7}
        bg={["#dce7c9", "#eee1c9", "#d3e2d9"][index]}
      />
      <Box position={[0, 2.8, 3.4]} size={[0.05, 0.4, 0.05]} color="#7b8174" />
    </group>
  );
}
function Plant({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.35, 0.25, 0.6, 12]} />
        <meshStandardMaterial color="#c7a77c" />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[
            Math.sin(i * 2) * 0.22,
            0.85 + (i % 2) * 0.2,
            Math.cos(i * 2) * 0.22,
          ]}
          rotation={[0.3, i, 0.3]}
          scale={[0.22, 0.7, 0.15]}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color={i % 2 ? "#617d48" : "#799259"} />
        </mesh>
      ))}
    </group>
  );
}
function Market() {
  const maps = useMemo(
    () =>
      Object.fromEntries(
        products.map((p) => [p.id, labelTexture(p.label, p.accent, p.color)]),
      ),
    [],
  );
  useEffect(
    () => () => Object.values(maps).forEach((t) => t.dispose()),
    [maps],
  );
  const quality = useWorld((s) => s.quality);
  const floorMap = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#e7e3d7";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#d0ccbd";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(14, 16);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => floorMap.dispose(), [floorMap]);
  return (
    <ProductTextures.Provider value={maps}>
      <color attach="background" args={["#e1e7dc"]} />
      <fog attach="fog" args={["#e1e7dc", 20, 48]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#fff8e6", "#a7b4a0", 0.8]} />
      <directionalLight
        position={[5, 12, 8]}
        intensity={1.8}
        castShadow={quality === "high"}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1]} receiveShadow>
        <planeGeometry args={[20, 23]} />
        <meshStandardMaterial map={floorMap} roughness={0.85} />
      </mesh>
      <Box position={[0, 2, -9.5]} size={[20, 4, 0.3]} color="#d8dfcd" />
      <Box position={[-10, 2, 1]} size={[0.25, 4, 22]} color="#e1e3d7" />
      <Box position={[10, 2, 1]} size={[0.25, 4, 22]} color="#e1e3d7" />
      <Box position={[0, 0.35, -9.2]} size={[20, 0.7, 0.12]} color="#7d916c" />
      <Sign
        text="good things grow here."
        position={[0, 2.9, -9.3]}
        width={7}
        bg="#d8dfcd"
        fg="#3a5b44"
      />
      {[-7, 0, 7].map((x) => (
        <group key={x}>
          <Box position={[x, 4, 0]} size={[0.2, 0.18, 19]} color="#777c6c" />
          {[-6, 1, 8].map((z) => (
            <Box
              key={z}
              position={[x, 3.9, z]}
              size={[2.5, 0.08, 0.55]}
              color="#fffbe3"
            />
          ))}
        </group>
      ))}
      {shelfCenters.map((center, i) => (
        <Shelf key={i} center={center} index={i} />
      ))}
      <Sign text="LUNOVA MARKET" position={[-7.6, 2.8, -8.8]} width={3} />
      <Box position={[-4, 2.1, 11.7]} size={[0.16, 4.2, 0.2]} color="#61775a" />
      <Box position={[4, 2.1, 11.7]} size={[0.16, 4.2, 0.2]} color="#61775a" />
      <Box position={[0, 4.15, 11.7]} size={[8.2, 0.2, 0.2]} color="#61775a" />
      <Plant position={[-8.6, 0, -7.5]} />
      <Plant position={[8.6, 0, -7.5]} />
      <Plant position={[-8.8, 0, 9]} />
      <Plant position={[8.8, 0, 9]} />
      <Box position={[-6, 0.012, 7.3]} size={[3, 0.02, 2]} color="#b7c49f" />
      <Box position={[6, 0.012, 7.3]} size={[3, 0.02, 2]} color="#b7c49f" />
      <Sign
        text="Fresh finds. Happy days."
        position={[-9.8, 2.5, 3]}
        width={2.5}
      />
    </ProductTextures.Provider>
  );
}

function Player({ enabled, onPosition }) {
  const elapsed = useRef(0);
  const { camera, gl } = useThree();
  const yaw = useRef(0),
    pitch = useRef(-0.05),
    keys = useRef({}),
    drag = useRef(null);
  const teleport = useWorld((s) => s.teleport);
  const selected = useWorld((s) => s.selected),
    modal = useWorld((s) => s.modal);
  const setLocked = useWorld((s) => s.setLocked);
  const blocked = !!selected || !!modal || !enabled;
  useEffect(() => {
    camera.position.set(0, 1.75, 9);
    camera.rotation.order = "YXZ";
  }, [camera]);
  useEffect(() => {
    if (teleport) {
      camera.position.set(...teleport.position);
      yaw.current = 0;
      pitch.current = -0.05;
    }
  }, [teleport, camera]);
  useEffect(() => {
    const down = (e) => {
      if (["INPUT", "TEXTAREA", "BUTTON", "SELECT"].includes(e.target.tagName))
        return;
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.code)
      ) {
        e.preventDefault();
        keys.current[e.code] = true;
      }
    };
    const up = (e) => {
      keys.current[e.code] = false;
    };
    const clear = () => {
      keys.current = {};
      Object.keys(movement).forEach((k) => (movement[k] = false));
      drag.current = null;
    };
    const lock = () => setLocked(document.pointerLockElement === gl.domElement);
    const move = (e) => {
      if (blocked) return;
      let dx = 0,
        dy = 0;
      if (document.pointerLockElement === gl.domElement) {
        dx = e.movementX;
        dy = e.movementY;
      } else if (drag.current && drag.current.id === e.pointerId) {
        dx = e.clientX - drag.current.x;
        dy = e.clientY - drag.current.y;
        drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      } else return;
      yaw.current -= dx * 0.003;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - dy * 0.003,
        -1.15,
        1.15,
      );
    };
    const start = (e) => {
      if (!blocked)
        drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    };
    const stop = () => {
      drag.current = null;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("pointerlockchange", lock);
    window.addEventListener("pointermove", move);
    gl.domElement.addEventListener("pointerdown", start);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", clear);
    return () => {
      clear();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("pointerlockchange", lock);
      window.removeEventListener("pointermove", move);
      gl.domElement.removeEventListener("pointerdown", start);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", clear);
    };
  }, [blocked, gl, setLocked]);
  useFrame((_, dt) => {
    if (blocked) return;
    const k = keys.current;
    let forward =
      Number(!!(k.KeyW || k.ArrowUp || movement.forward)) -
      Number(!!(k.KeyS || k.ArrowDown || movement.back));
    let strafe =
      Number(!!(k.KeyD || k.ArrowRight || movement.right)) -
      Number(!!(k.KeyA || k.ArrowLeft || movement.left));
    const len = Math.hypot(forward, strafe) || 1;
    forward /= len;
    strafe /= len;
    const speed = 3.3 * Math.min(dt, 0.05);
    const dx =
      (strafe * Math.cos(yaw.current) - forward * Math.sin(yaw.current)) *
      speed;
    const dz =
      (-forward * Math.cos(yaw.current) - strafe * Math.sin(yaw.current)) *
      speed;
    const p = movePlayer(camera.position, dx, dz);
    camera.position.x = p.x;
    camera.position.z = p.z;
    camera.rotation.set(pitch.current, yaw.current, 0);
    elapsed.current += dt;
    if (elapsed.current > 0.1) {
      onPosition?.(p.x, p.z);
      elapsed.current = 0;
    }
  });
  return null;
}
class SceneBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="scene-fallback">
        <h2>Your product aisle is ready</h2>
        <p>
          3D graphics aren’t available on this device. You can still browse
          every sample product using the Browse products button.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function StoreScene({ enabled = true, onPosition }) {
  const quality = useWorld((s) => s.quality);
  return (
    <SceneBoundary>
      <Canvas
        events={(state) => ({
          ...events(state),
          compute: (event, root) => {
            if (document.pointerLockElement === root.gl.domElement) {
              root.pointer.set(0, 0);
              root.raycaster.setFromCamera(root.pointer, root.camera);
            } else events(state).compute(event, root);
          },
        })}
        shadows={quality === "high"}
        dpr={quality === "high" ? [1, 1.5] : 1}
        camera={{ fov: 65, near: 0.1, far: 65 }}
        gl={{
          antialias: quality === "high",
          powerPreference:
            quality === "high" ? "high-performance" : "low-power",
        }}
        onCreated={({ gl }) => {
          gl.domElement.setAttribute(
            "aria-label",
            "Interactive 3D supermarket. Use WASD to move, drag to look, and click products to inspect them.",
          );
          gl.domElement.setAttribute("data-testid", "store-canvas");
        }}
      >
        <Suspense fallback={null}>
          <Market />
          <Player enabled={enabled} onPosition={onPosition} />
        </Suspense>
      </Canvas>
    </SceneBoundary>
  );
}
