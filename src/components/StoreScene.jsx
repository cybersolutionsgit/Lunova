import { Suspense, useEffect, useMemo, useRef, Component } from "react";
import { Canvas, events, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld, useCatalog } from "../lib/store";
import { displays, movePlayer } from "../lib/world";
import { movement } from "../lib/controls";
function labelTexture(
  text,
  fg = "#674451",
  bg = "#f5ebe5",
  subtitle = "L U N O V A  S E C R E T S",
) {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.textAlign = "center";
  ctx.fillStyle = fg;
  ctx.font = "20px sans-serif";
  ctx.fillText(subtitle, 384, 65);
  ctx.font = `${text.length > 28 ? 30 : 42}px Georgia`;
  ctx.fillText(text.slice(0, 40), 384, 150, 720);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function Sign({
  text,
  position,
  width = 3,
  bg = "#f5ebe5",
  fg = "#674451",
  rotation,
}) {
  const map = useMemo(() => labelTexture(text, fg, bg), [text, fg, bg]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, width / 3]} />
      <meshBasicMaterial map={map} side={THREE.DoubleSide} />
    </mesh>
  );
}
function Box({ position, size, color, ...props }) {
  return (
    <mesh position={position} {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}
function Pole({ position, height = 3, radius = 0.035, rotation }) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <cylinderGeometry args={[radius, radius, height, 10]} />
      <meshStandardMaterial color="#b69565" metalness={0.7} roughness={0.3} />
    </mesh>
  );
}
function useProductMaps(products) {
  const maps = useMemo(
    () =>
      Object.fromEntries(
        products
          .filter((p) => p.display !== null)
          .map((p) => {
            const c = document.createElement("canvas");
            c.width = 512;
            c.height = 684;
            const ctx = c.getContext("2d");
            ctx.fillStyle = "#eee1da";
            ctx.fillRect(0, 0, 512, 684);
            ctx.fillStyle = "#896171";
            ctx.textAlign = "center";
            ctx.font = "23px Georgia";
            ctx.fillText(p.name.slice(0, 28), 256, 320);
            ctx.font = "15px sans-serif";
            ctx.fillText("PHOTO LOADING / UNAVAILABLE", 256, 370);
            const texture = new THREE.CanvasTexture(c);
            texture.colorSpace = THREE.SRGBColorSpace;
            return [p.id, { texture, canvas: c }];
          }),
      ),
    [products],
  );
  useEffect(() => {
    let cancelled = false;
    const images = [];
    for (const p of products) {
      const entry = maps[p.id];
      if (!entry) continue;
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        if (cancelled) return;
        const ctx = entry.canvas.getContext("2d");
        ctx.fillStyle = "#f5eee8";
        ctx.fillRect(0, 0, 512, 684);
        const scale = Math.min(512 / image.width, 684 / image.height);
        const w = image.width * scale,
          h = image.height * scale;
        ctx.drawImage(image, (512 - w) / 2, (684 - h) / 2, w, h);
        entry.texture.needsUpdate = true;
      };
      image.onerror = () => {
        if (cancelled) return;
        const ctx = entry.canvas.getContext("2d");
        ctx.fillStyle = "#eee1da";
        ctx.fillRect(0, 0, 512, 684);
        ctx.fillStyle = "#896171";
        ctx.textAlign = "center";
        ctx.font = "23px Georgia";
        ctx.fillText(p.name.slice(0, 28), 256, 310);
        ctx.font = "17px sans-serif";
        ctx.fillText("Photo unavailable in 3D", 256, 355);
        ctx.fillText("See photo in Product view", 256, 385);
        entry.texture.needsUpdate = true;
      };
      image.src = p.image;
      images.push(image);
    }
    return () => {
      cancelled = true;
      images.forEach((i) => {
        i.onload = null;
        i.onerror = null;
      });
      Object.values(maps).forEach((v) => v.texture.dispose());
    };
  }, [products, maps]);
  return maps;
}
function Photo({ map, position, width = 1.25 }) {
  return (
    <group position={position}>
      <Box
        position={[0, 0, -0.04]}
        size={[width + 0.07, width * 1.336 + 0.07, 0.07]}
        color="#b69565"
      />
      <mesh position={[0, 0, 0.008]}>
        <planeGeometry args={[width, width * 1.336]} />
        <meshBasicMaterial map={map} />
      </mesh>
    </group>
  );
}
function Hanger({ position }) {
  const points = useMemo(
    () => [
      new THREE.Vector3(-0.35, 0, 0),
      new THREE.Vector3(0, 0.22, 0),
      new THREE.Vector3(0.35, 0, 0),
      new THREE.Vector3(-0.35, 0, 0),
    ],
    [],
  );
  const geo = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(points),
    [points],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group position={position}>
      <line geometry={geo}>
        <lineBasicMaterial color="#b69565" />
      </line>
      <Pole position={[0, 0.27, 0]} height={0.12} radius={0.012} />
    </group>
  );
}
function Form({ position, color, category }) {
  const long = category === "sleepwear" || category === "robes";
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.42, 0.45, 0.12, 24]} />
        <meshStandardMaterial
          color="#af9069"
          metalness={0.5}
          roughness={0.35}
        />
      </mesh>
      <Pole position={[0, 0.48, 0]} height={0.8} radius={0.035} />
      <mesh position={[0, 1.55, 0]} scale={[0.35, 0.58, 0.2]} castShadow>
        <sphereGeometry args={[1, 20, 18]} />
        <meshStandardMaterial color="#d4c3b6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.22, 0]} scale={[0.32, 0.24, 0.22]}>
        <sphereGeometry args={[1, 20, 16]} />
        <meshStandardMaterial color="#d4c3b6" />
      </mesh>
      <Pole position={[0, 2.17, 0]} height={0.16} radius={0.09} />
      {long ? (
        <>
          <mesh position={[0, 1.4, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.47, 1.2, 24]} />
            <meshStandardMaterial color={color} roughness={0.45} />
          </mesh>
          {category === "robes" && (
            <Box
              position={[0, 1.45, 0.3]}
              size={[0.65, 0.065, 0.06]}
              color="#d6b497"
            />
          )}
        </>
      ) : (
        <>
          <mesh position={[0, 1.8, 0.035]} scale={[0.365, 0.19, 0.215]}>
            <sphereGeometry args={[1, 20, 12]} />
            <meshStandardMaterial color={color} roughness={0.75} />
          </mesh>
          <mesh position={[0, 1.15, 0.025]} scale={[0.33, 0.16, 0.235]}>
            <sphereGeometry args={[1, 20, 12]} />
            <meshStandardMaterial color={color} roughness={0.75} />
          </mesh>
          {[-0.24, 0.24].map((x) => (
            <Box
              key={x}
              position={[x, 1.98, 0]}
              size={[0.045, 0.3, 0.23]}
              color={color}
            />
          ))}
        </>
      )}
    </group>
  );
}
function Display({ fixture, index, product, map }) {
  const select = useWorld((s) => s.select);
  return (
    <group
      position={[fixture.position[0], 0, fixture.position[1]]}
      rotation={[0, fixture.rotation, 0]}
    >
      <Box
        position={[0, 0.09, 0]}
        size={[2.3, 0.18, 1.1]}
        color="#ddc9bd"
        castShadow
        receiveShadow
      />
      {[-1.04, 1.04].map((x) => (
        <Pole key={x} position={[x, 1.5, -0.08]} height={2.8} />
      ))}
      <Pole
        position={[0, 2.9, -0.08]}
        height={2.08}
        rotation={[0, 0, Math.PI / 2]}
      />
      <Sign
        text={`${String(index + 1).padStart(2, "0")} · ${product ? product.name : "Your next favorite"}`}
        position={[0, 3.15, 0]}
        width={2.25}
      />
      {product ? (
        <group
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta < 6) select(product);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => (document.body.style.cursor = "auto")}
        >
          {product.presentation === "mannequin" ? (
            <>
              <Form
                position={[-0.35, 0.12, 0]}
                color={product.color}
                category={product.category}
              />
              <Photo map={map} position={[0.62, 1.65, 0.3]} width={0.64} />
            </>
          ) : (
            <>
              <Hanger position={[0, 2.59, 0]} />
              <Photo map={map} position={[0, 1.72, 0.08]} width={1.25} />
            </>
          )}
        </group>
      ) : (
        <>
          <Hanger position={[-0.45, 2.56, 0]} />
          <Hanger position={[0.45, 2.56, 0]} />
        </>
      )}
    </group>
  );
}
function Plant({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.28, 0.22, 0.6, 12]} />
        <meshStandardMaterial color="#c2a891" />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[
            Math.sin(i * 2) * 0.2,
            0.85 + (i % 2) * 0.2,
            Math.cos(i * 2) * 0.2,
          ]}
          rotation={[0.3, i, 0.3]}
          scale={[0.16, 0.6, 0.1]}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color={i % 2 ? "#797d60" : "#a0a284"} />
        </mesh>
      ))}
    </group>
  );
}
function Market() {
  const products = useCatalog((s) => s.products);
  const maps = useProductMaps(products);
  const quality = useWorld((s) => s.quality);
  const floorMap = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#eee5dc";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#e2d6cd";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 256, 256);
    ctx.beginPath();
    ctx.moveTo(5, 180);
    ctx.bezierCurveTo(80, 140, 70, 100, 150, 0);
    ctx.strokeStyle = "#d9ccc150";
    ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 11);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => floorMap.dispose(), [floorMap]);
  return (
    <>
      <color attach="background" args={["#eaded7"]} />
      <fog attach="fog" args={["#eaded7", 24, 52]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#fff4e7", "#b5a197", 1]} />
      <directionalLight
        position={[4, 10, 8]}
        intensity={2}
        castShadow={quality === "high"}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1]} receiveShadow>
        <planeGeometry args={[20, 23]} />
        <meshStandardMaterial map={floorMap} roughness={0.65} />
      </mesh>
      <Box position={[0, 2.3, -9.5]} size={[20, 4.6, 0.3]} color="#c9a5a5" />
      <Box position={[-10, 2.3, 1]} size={[0.25, 4.6, 22]} color="#e5d1c8" />
      <Box position={[10, 2.3, 1]} size={[0.25, 4.6, 22]} color="#e5d1c8" />
      <Box
        position={[0, 0.12, -9.25]}
        size={[20, 0.24, 0.08]}
        color="#b39670"
      />
      <Sign
        text="LUNOVA secrets"
        position={[0, 3.65, -9.3]}
        width={6}
        bg="#c9a5a5"
        fg="#583b48"
      />
      <Sign
        text="A little confidence. A world of you."
        position={[0, 2.8, -9.3]}
        width={4.7}
        bg="#c9a5a5"
        fg="#684551"
      />
      {[-7, 7].map((x) => (
        <group key={x} position={[x, 0, -8.9]}>
          <Box position={[0, 1.4, 0]} size={[2.2, 2.8, 0.08]} color="#76505c" />
          {Array.from({ length: 10 }, (_, i) => (
            <mesh key={i} position={[-1 + i * 0.22, 1.4, 0.06]}>
              <cylinderGeometry args={[0.13, 0.13, 2.8, 10]} />
              <meshStandardMaterial
                color={i % 2 ? "#936674" : "#825765"}
                roughness={1}
              />
            </mesh>
          ))}
          <Sign text="FITTING ROOM" position={[0, 3.1, 0.1]} width={1.8} />
        </group>
      ))}
      {[-7, 0, 7].map((x) => (
        <group key={x}>
          <Pole
            position={[x, 4.2, 0]}
            height={19}
            radius={0.035}
            rotation={[Math.PI / 2, 0, 0]}
          />
          {[-5, 2, 8].map((z) => (
            <group key={z} position={[x, 3.85, z]}>
              <mesh>
                <sphereGeometry args={[0.23, 16, 12]} />
                <meshStandardMaterial
                  color="#fff0d5"
                  emissive="#ffe4b6"
                  emissiveIntensity={0.5}
                />
              </mesh>
              <Pole position={[0, 0.3, 0]} height={0.4} radius={0.015} />
            </group>
          ))}
        </group>
      ))}
      {displays.map((fixture, index) => {
        const product = products.find((p) => p.display === index);
        return (
          <Display
            key={index}
            fixture={fixture}
            index={index}
            product={product}
            map={product && maps[product.id]?.texture}
          />
        );
      })}
      <mesh position={[0, 0.012, 7.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 64]} />
        <meshStandardMaterial color="#cba9a5" roughness={1} />
      </mesh>
      <Plant position={[-8.7, 0, 9]} />
      <Plant position={[8.7, 0, 9]} />
      <Plant position={[-8.7, 0, -6]} />
      <Plant position={[8.7, 0, -6]} />
      <Box
        position={[-4, 2.1, 11.7]}
        size={[0.12, 4.2, 0.15]}
        color="#b69565"
      />
      <Box position={[4, 2.1, 11.7]} size={[0.12, 4.2, 0.15]} color="#b69565" />
      <Box
        position={[0, 4.15, 11.7]}
        size={[8.2, 0.12, 0.15]}
        color="#b69565"
      />
    </>
  );
}
function Player({ enabled, onPosition }) {
  const elapsed = useRef(0);
  const { camera, gl } = useThree();
  const yaw = useRef(0),
    pitch = useRef(-0.05),
    keys = useRef({}),
    drag = useRef(null),
    hover = useRef(null);
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
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
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
      hover.current = null;
    };
    const lock = () => setLocked(document.pointerLockElement === gl.domElement);
    const move = (e) => {
      if (blocked) return;
      let dx = 0,
        dy = 0;
      if (document.pointerLockElement === gl.domElement) {
        dx = e.movementX;
        dy = e.movementY;
      } else if (e.pointerType === "mouse") {
        if (e.target !== gl.domElement) {
          hover.current = null;
          return;
        }
        if (!hover.current) {
          hover.current = { x: e.clientX, y: e.clientY };
          return;
        }
        dx = e.clientX - hover.current.x;
        dy = e.clientY - hover.current.y;
        hover.current = { x: e.clientX, y: e.clientY };
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
    const leave = () => {
      hover.current = null;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("pointerlockchange", lock);
    window.addEventListener("pointermove", move);
    gl.domElement.addEventListener("pointerdown", start);
    gl.domElement.addEventListener("pointerleave", leave);
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
      gl.domElement.removeEventListener("pointerleave", leave);
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
      onPosition?.(p.x, p.z, yaw.current, pitch.current);
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
        <h2>Your boutique collection is ready</h2>
        <p>
          3D graphics aren’t available on this device. You can still browse
          every product using the Browse products button.
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
            "Interactive 3D lingerie boutique. Use WASD to move, move the mouse to look (drag on touch screens), and click products to inspect them.",
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
