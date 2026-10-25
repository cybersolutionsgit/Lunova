import { Suspense, useEffect, useMemo, useRef, Component } from "react";
import { Canvas, events, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld, useCatalog } from "../lib/store";
import { displays, movePlayer } from "../lib/world";
import { FixtureShell, FixtureProps } from "./StoreFixtures";
import { groupedProducts, productPlacement } from "../lib/merchandising";
import { money } from "../lib/products";
import CarriedBasket from "./CarriedBasket";
import StoreVisitors from "./StoreVisitors";
import { visitorObstacles, visitorPoses } from "../lib/visitors";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
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
  const name = useCatalog((s) => s.settings.name);
  const map = useMemo(
    () => labelTexture(text, fg, bg, name.toUpperCase()),
    [text, fg, bg, name],
  );
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
function Display({ fixture, index, products, maps }) {
  const select = useWorld((s) => s.select),
    quality = useWorld((s) => s.quality);
  const settings = useCatalog((s) => s.settings),
    currency = useCatalog((s) => s.currency);
  const { type, theme } = settings;
  return (
    <group
      position={[fixture.position[0], 0, fixture.position[1]]}
      rotation={[0, fixture.rotation, 0]}
    >
      <FixtureShell type={type} theme={theme} />
      <Sign
        text={`${String(index + 1).padStart(2, "0")} · ${products.length ? products.length + " products" : "New collection"}`}
        position={[
          0,
          type === "boutique" || type === "shoes" || type === "mart"
            ? 3.15
            : 2.4,
          0,
        ]}
        width={2.25}
      />
      {products.map((product) => {
        const layout = productPlacement(type, product.displaySlot ?? 0);
        return (
          <group
            key={product.id}
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
            <group position={layout.prop}>
              <FixtureProps
                type={type}
                product={product}
                detail={quality === "high"}
              />
            </group>
            <Photo
              map={maps[product.id]?.texture}
              position={layout.photo}
              width={layout.width}
            />
            <Sign
              text={`${product.name.slice(0, 21)} · ${money(product.price, currency)}`}
              position={[
                layout.photo[0],
                layout.photo[1] - layout.width * 0.668 - 0.1,
                layout.photo[2] + 0.02,
              ]}
              width={layout.width + 0.07}
            />
          </group>
        );
      })}
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
  const { gl, scene } = useThree();
  const settings = useCatalog((s) => s.settings);
  const { theme } = settings;
  useEffect(() => {
    gl.domElement.dataset.storeType = settings.type;
    gl.domElement.setAttribute(
      "aria-label",
      `${settings.name}: ${settings.type} virtual store. Use WASD to walk; click Click to look around to capture the mouse, or drag to walk on touch screens.`,
    );
  }, [gl, settings.type, settings.name]);
  const products = useCatalog((s) => s.products);
  const maps = useProductMaps(products);
  const quality = useWorld((s) => s.quality);
  const groups = useMemo(() => groupedProducts(products), [products]);
  useEffect(() => {
    gl.domElement.dataset.displayedProducts = String(
      products.filter((p) => p.display !== null).length,
    );
    gl.domElement.dataset.fixtureOccupancy = JSON.stringify(
      groups.map((group) => group.length),
    );
  }, [gl, products, groups]);
  useEffect(() => {
    if (quality !== "high") {
      scene.environment = null;
      return;
    }
    const generator = new THREE.PMREMGenerator(gl),
      room = new RoomEnvironment();
    const target = generator.fromScene(room, 0.04);
    scene.environment = target.texture;
    room.dispose();
    generator.dispose();
    return () => {
      scene.environment = null;
      target.dispose();
    };
  }, [gl, scene, quality]);
  const floorMap = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = theme.floor;
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
  }, [theme.floor]);
  useEffect(() => () => floorMap.dispose(), [floorMap]);
  return (
    <>
      <color attach="background" args={[theme.wall]} />
      <fog attach="fog" args={[theme.wall, 24, 52]} />
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
      <Box position={[0, 2.3, -9.5]} size={[20, 4.6, 0.3]} color={theme.wall} />
      <Box position={[-10, 2.3, 1]} size={[0.25, 4.6, 22]} color={theme.wall} />
      <Box position={[10, 2.3, 1]} size={[0.25, 4.6, 22]} color={theme.wall} />
      <Box
        position={[0, 0.12, -9.25]}
        size={[20, 0.24, 0.08]}
        color={theme.metal}
      />
      <Sign
        text={settings.name}
        position={[0, 3.65, -9.3]}
        width={6}
        bg={theme.wall}
        fg="#583b48"
      />
      <Sign
        text={settings.tagline}
        position={[0, 2.8, -9.3]}
        width={4.7}
        bg={theme.wall}
        fg="#684551"
      />
      {settings.type === "boutique" &&
        [-7, 7].map((x) => (
          <group key={x} position={[x, 0, -8.9]}>
            <Box
              position={[0, 1.4, 0]}
              size={[2.2, 2.8, 0.08]}
              color="#76505c"
            />
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
      {displays.map((fixture, index) => (
        <Display
          key={index}
          fixture={fixture}
          index={index}
          products={groups[index]}
          maps={maps}
        />
      ))}
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
  const quality = useWorld((s) => s.quality);
  const visitorsEnabled = useWorld((s) => s.visitorsEnabled);
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
    const lock = () => {
      hover.current = null;
      setLocked(document.pointerLockElement === gl.domElement);
    };
    const move = (e) => {
      if (blocked) return;
      if (e.pointerType === "mouse" && e.buttons !== 0) {
        // Track the held cursor so releasing never causes a camera jump.
        hover.current = { x: e.clientX, y: e.clientY };
        return;
      }
      let dx = 0,
        dy = 0;
      if (document.pointerLockElement === gl.domElement) {
        dx = e.movementX;
        dy = e.movementY;
      } else if (e.pointerType === "mouse") {
        if (e.target !== gl.domElement) return;
        const bounds = gl.domElement.getBoundingClientRect();
        const x = THREE.MathUtils.clamp(
          ((e.clientX - bounds.left) / bounds.width) * 2 - 1,
          -1,
          1,
        );
        const y = THREE.MathUtils.clamp(
          ((e.clientY - bounds.top) / bounds.height) * 2 - 1,
          -1,
          1,
        );
        // Absolute screen position gives a repeatable full panorama, even after
        // leaving the canvas or closing a menu. Screen centre always faces front.
        yaw.current = -x * Math.PI;
        pitch.current = THREE.MathUtils.clamp(-0.05 - y * 1.1, -1.15, 1.15);
        // Keep product raycasting aligned even when a click follows this event
        // before the next animation frame.
        camera.rotation.set(pitch.current, yaw.current, 0);
        camera.updateMatrixWorld();
        return;
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
    gl.domElement.addEventListener("pointerenter", move);
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
      gl.domElement.removeEventListener("pointerenter", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", clear);
    };
  }, [blocked, gl, camera, setLocked]);
  useFrame((_, dt) => {
    if (blocked) return;
    const k = keys.current;
    let forward =
      Math.max(Number(!!(k.KeyW || k.ArrowUp)), Number(movement.forward)) -
      Math.max(Number(!!(k.KeyS || k.ArrowDown)), Number(movement.back));
    let strafe =
      Math.max(Number(!!(k.KeyD || k.ArrowRight)), Number(movement.right)) -
      Math.max(Number(!!(k.KeyA || k.ArrowLeft)), Number(movement.left));
    const len = Math.max(1, Math.hypot(forward, strafe));
    forward /= len;
    strafe /= len;
    const speed = 3.3 * Math.min(dt, 0.05);
    const dx =
      (strafe * Math.cos(yaw.current) - forward * Math.sin(yaw.current)) *
      speed;
    const dz =
      (-forward * Math.cos(yaw.current) - strafe * Math.sin(yaw.current)) *
      speed;
    const p = movePlayer(
      camera.position,
      dx,
      dz,
      visitorObstacles(quality, visitorsEnabled, visitorPoses),
    );
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
  const selected = useWorld((s) => s.selected),
    modal = useWorld((s) => s.modal);
  const paused = !enabled || !!selected || !!modal;
  const quality = useWorld((s) => s.quality);
  return (
    <SceneBoundary>
      <Canvas
        frameloop={paused ? "demand" : "always"}
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
            "Interactive 3D lingerie boutique. Use WASD to move. Click Click to look around to capture the mouse; Escape releases it. Drag to walk on touch screens and click products to inspect them.",
          );
          gl.domElement.setAttribute("data-testid", "store-canvas");
        }}
      >
        <Suspense fallback={null}>
          <Market />
          <StoreVisitors paused={paused} />
          <Player enabled={enabled} onPosition={onPosition} />
          <CarriedBasket />
        </Suspense>
      </Canvas>
    </SceneBoundary>
  );
}
