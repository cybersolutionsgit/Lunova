import { useMemo, useEffect } from "react";
import * as THREE from "three";
function Box({
  position,
  size,
  color,
  metalness = 0,
  roughness = 0.65,
  ...props
}) {
  return (
    <mesh position={position} {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
      />
    </mesh>
  );
}
function Pole({
  position,
  height = 2.6,
  radius = 0.025,
  rotation,
  color = "#b69565",
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, height, 12]} />
      <meshStandardMaterial color={color} metalness={0.8} roughness={0.24} />
    </mesh>
  );
}
function Glass({ position, size, rotation }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color="#dcebf0"
        transparent
        opacity={0.13}
        depthWrite={false}
        metalness={0.2}
        roughness={0.12}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
export function FixtureShell({ type, theme }) {
  const counter = ["bakery", "beauty", "jewelry"].includes(type);
  if (type === "boutique")
    return (
      <>
        <Box
          position={[0, 0.15, 0]}
          size={[2.25, 0.16, 1.04]}
          color={theme.surface}
        />
        {[-1, 1].map((x) => (
          <group key={x}>
            <Pole position={[x, 1.5, 0]} height={2.65} color={theme.metal} />
            {[-0.36, 0.36].map((z) => (
              <mesh
                key={z}
                position={[x, 0.065, z]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.065, 0.065, 0.05, 12]} />
                <meshStandardMaterial color="#303138" roughness={0.8} />
              </mesh>
            ))}
          </group>
        ))}
        <Pole
          position={[0, 2.8, 0]}
          height={2.05}
          rotation={[0, 0, Math.PI / 2]}
          color={theme.metal}
        />
        <Box
          position={[0, 0.3, 0]}
          size={[2.1, 0.04, 0.8]}
          color={theme.metal}
          metalness={0.5}
        />
      </>
    );
  if (type === "shoes" || type === "mart")
    return (
      <>
        <Box
          position={[0, 1.45, -0.48]}
          size={[2.25, 2.85, 0.06]}
          color={theme.surface}
        />
        {[-1.08, 1.08].map((x) => (
          <Box
            key={x}
            position={[x, 1.45, 0]}
            size={[0.07, 2.9, 1.05]}
            color={theme.metal}
            metalness={0.5}
          />
        ))}
        {[0.55, 1.25, 1.95].map((y) => (
          <group key={y}>
            <Box
              position={[0, y, 0]}
              size={[2.2, 0.055, 1.02]}
              color={theme.surface}
            />
            <Box
              position={[0, y + 0.025, -0.42]}
              size={[2, 0.025, 0.025]}
              color="#fff0ca"
              roughness={0.2}
            />
            <Box
              position={[0, y - 0.045, 0.48]}
              size={[2.2, 0.035, 0.045]}
              color={theme.metal}
              metalness={0.8}
            />
          </group>
        ))}
        <Box
          position={[0, 0.12, 0]}
          size={[2.3, 0.24, 1.1]}
          color={theme.metal}
        />
      </>
    );
  if (counter)
    return (
      <>
        <Box
          position={[0, 0.4, 0]}
          size={[2.3, 0.8, 1.1]}
          color={type === "bakery" ? "#95694b" : theme.surface}
        />
        {[-0.75, 0, 0.75].map((x) => (
          <group key={x}>
            <Box
              position={[x, 0.4, 0.556]}
              size={[0.012, 0.6, 0.018]}
              color={theme.metal}
            />
            <Box
              position={[x + 0.18, 0.7, 0.57]}
              size={[0.18, 0.025, 0.035]}
              color={theme.metal}
              metalness={0.9}
            />
          </group>
        ))}
        <Box
          position={[0, 0.84, 0]}
          size={[2.32, 0.065, 1.12]}
          color={theme.metal}
          metalness={0.8}
          roughness={0.2}
        />
        <Box
          position={[0, 1.37, -0.49]}
          size={[2.15, 1.0, 0.025]}
          color="#cbd1d1"
          metalness={0.95}
          roughness={0.08}
        />
        <Glass
          position={[0, 1.37, 0.51]}
          size={[2.2, 0.98, 0.025]}
          rotation={[-0.1, 0, 0]}
        />
        {[-1.08, 1.08].map((x) => (
          <Glass key={x} position={[x, 1.38, 0]} size={[0.025, 1.05, 1.0]} />
        ))}
        <Glass position={[0, 1.9, 0]} size={[2.2, 0.03, 1.05]} />
        <Box
          position={[0, 1.92, -0.44]}
          size={[2.1, 0.035, 0.04]}
          color="#fff0cf"
        />
      </>
    );
  return (
    <>
      <Box
        position={[0, 0.35, 0]}
        size={[2.3, 0.7, 1.1]}
        color={theme.surface}
      />
      {[-1.08, 1.08].map((x) => (
        <Pole
          key={x}
          position={[x, 1.5, -0.44]}
          height={3}
          color={theme.metal}
        />
      ))}
      <Box
        position={[0, 0.74, 0]}
        size={[2.3, 0.08, 1.1]}
        color={theme.metal}
        metalness={0.5}
      />
    </>
  );
}
function Hanger() {
  const geometry = useMemo(() => {
    const points = [
      [-0.24, 0, 0],
      [0, 0.16, 0],
      [0.24, 0, 0],
      [-0.24, 0, 0],
    ].map((p) => new THREE.Vector3(...p));
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group position={[0, 0.87, 0]}>
      <line geometry={geometry}>
        <lineBasicMaterial color="#b89b78" />
      </line>
      <mesh position={[0, 0.22, 0]}>
        <torusGeometry args={[0.055, 0.009, 6, 12, Math.PI * 1.6]} />
        <meshStandardMaterial
          color="#b89b78"
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}
function Garment({ product }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.09, 0.66);
    s.lineTo(-0.2, 0.7);
    s.lineTo(-0.32, 0.5);
    s.lineTo(-0.22, 0.41);
    s.lineTo(-0.18, 0.49);
    s.lineTo(-0.2, -0.18);
    s.quadraticCurveTo(0, -0.23, 0.2, -0.18);
    s.lineTo(0.18, 0.49);
    s.lineTo(0.22, 0.41);
    s.lineTo(0.32, 0.5);
    s.lineTo(0.2, 0.7);
    s.lineTo(0.09, 0.66);
    s.quadraticCurveTo(0, 0.53, -0.09, 0.66);
    return s;
  }, []);
  const lingerie = ["sets", "bras", "underwear"].includes(product.category),
    color = product.color;
  return (
    <group>
      <Hanger />
      {lingerie ? (
        <>
          {product.category !== "underwear" && (
            <group position={[0, 0.45, 0]}>
              {[-0.105, 0.105].map((x) => (
                <mesh
                  key={x}
                  position={[x, 0, 0.035]}
                  scale={[0.115, 0.09, 0.07]}
                >
                  <sphereGeometry args={[1, 16, 10]} />
                  <meshStandardMaterial color={color} roughness={0.9} />
                </mesh>
              ))}
              <Box
                position={[0, -0.06, 0]}
                size={[0.42, 0.055, 0.045]}
                color={color}
              />
              {[-0.17, 0.17].map((x) => (
                <Box
                  key={x}
                  position={[x, 0.17, -0.01]}
                  size={[0.025, 0.35, 0.035]}
                  color={color}
                />
              ))}
            </group>
          )}
          {product.category !== "bras" && (
            <group
              position={[0, product.category === "underwear" ? 0.58 : 0.04, 0]}
            >
              <mesh scale={[0.2, 0.12, 0.055]}>
                <sphereGeometry args={[1, 16, 10]} />
                <meshStandardMaterial color={color} roughness={0.9} />
              </mesh>
              <Box
                position={[0, 0.09, 0.005]}
                size={[0.42, 0.035, 0.055]}
                color="#cfb5b5"
              />
            </group>
          )}
        </>
      ) : (
        <group>
          <mesh position={[0, 0.15, 0]} castShadow>
            <extrudeGeometry
              args={[
                shape,
                {
                  depth: 0.035,
                  bevelEnabled: true,
                  bevelSize: 0.012,
                  bevelThickness: 0.01,
                  bevelSegments: 1,
                  steps: 1,
                },
              ]}
            />
            <meshStandardMaterial color={color} roughness={0.86} />
          </mesh>
          <Box
            position={[0, 0.38, 0.055]}
            size={[0.018, 0.66, 0.014]}
            color="#ccb4ac"
          />
          {[0.6, 0.43, 0.26, 0.09].map((y) => (
            <mesh key={y} position={[0, y, 0.073]}>
              <sphereGeometry args={[0.012, 6, 6]} />
              <meshStandardMaterial color="#e3d2bf" />
            </mesh>
          ))}
          {product.category === "robes" && (
            <Box
              position={[0, 0.28, 0.08]}
              size={[0.4, 0.045, 0.02]}
              color="#c4a088"
            />
          )}
        </group>
      )}
    </group>
  );
}
function Shoe({ color, detail }) {
  const sole = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.12, -0.29);
    s.quadraticCurveTo(-0.24, -0.28, -0.2, 0.25);
    s.quadraticCurveTo(0, 0.43, 0.2, 0.25);
    s.quadraticCurveTo(0.23, -0.28, 0.12, -0.29);
    s.closePath();
    return s;
  }, []);
  const laces = useMemo(() => {
    const points = [];
    for (let i = 0; i < (detail ? 4 : 2); i++) {
      let z = -0.08 + i * 0.06;
      points.push(
        new THREE.Vector3(-0.09, 0.22, z),
        new THREE.Vector3(0.09, 0.22, z + 0.02),
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [detail]);
  useEffect(() => () => laces.dispose(), [laces]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <extrudeGeometry
          args={[
            sole,
            {
              depth: 0.065,
              bevelEnabled: true,
              bevelSize: 0.025,
              bevelThickness: 0.015,
              bevelSegments: 2,
              steps: 1,
            },
          ]}
        />
        <meshStandardMaterial color="#e7e1d7" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.12, 0.035]} scale={[0.19, 0.13, 0.31]} castShadow>
        <sphereGeometry args={[1, detail ? 20 : 12, 10]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <Box
        position={[0, 0.18, -0.19]}
        size={[0.25, 0.12, 0.13]}
        color={color}
      />
      <mesh position={[0, 0.2, -0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.09, 0.024, 6, 16]} />
        <meshStandardMaterial color="#3c3538" />
      </mesh>
      <lineSegments geometry={laces}>
        <lineBasicMaterial color="#f8f1e7" />
      </lineSegments>
    </group>
  );
}
function Pastry({ color, category, detail }) {
  const cake = /cake/.test(category);
  return (
    <group>
      <Box
        position={[0, -0.2, 0]}
        size={[0.61, 0.025, 0.72]}
        color="#c2b7a1"
        metalness={0.35}
      />
      {[-0.17, 0.17].map((z, i) => (
        <group key={z} position={[0, -0.05, z]}>
          <mesh
            scale={cake ? [0.21, 0.18, 0.21] : [0.24, 0.13, 0.18]}
            castShadow
          >
            <sphereGeometry args={[1, detail ? 20 : 12, 10]} />
            <meshStandardMaterial
              color={cake ? color : "#bf7c38"}
              roughness={0.9}
            />
          </mesh>
          {cake ? (
            <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.15, 0.045, 6, 16]} />
              <meshStandardMaterial color="#f4dfce" />
            </mesh>
          ) : (
            <>
              {[-0.1, 0, 0.1].map((x) => (
                <Box
                  key={x}
                  position={[x, 0.11, 0.01]}
                  size={[0.027, 0.008, 0.18]}
                  color="#e6ba71"
                  roughness={1}
                  rotation={[0, -0.25, 0]}
                />
              ))}
            </>
          )}
          {cake && (
            <mesh position={[0, 0.2, 0]}>
              <sphereGeometry args={[0.035, 8, 6]} />
              <meshStandardMaterial color="#a83d49" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
export function FixtureProps({ type, product, detail = true }) {
  const color = product?.color || "#8b5263";
  if (type === "boutique") return <Garment product={product} />;
  if (type === "shoes")
    return (
      <group>
        {(detail ? [-0.24, 0.24] : [0]).map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <Shoe color={color} detail={detail} />
          </group>
        ))}
      </group>
    );
  if (type === "bakery")
    return <Pastry color={color} category={product.category} detail={detail} />;
  if (type === "mart")
    return (
      <group>
        {[-0.4, 0, 0.4].map((x, i) => (
          <group key={x} position={[x, 0, 0]}>
            <Box
              position={[0, 0, 0]}
              size={[0.24, 0.4, 0.32]}
              color={i % 2 ? color : "#d4b37c"}
            />
            <Box
              position={[0, 0.02, 0.166]}
              size={[0.17, 0.23, 0.008]}
              color="#f1e7d5"
            />
          </group>
        ))}
      </group>
    );
  if (type === "beauty")
    return (
      <group>
        <mesh>
          <cylinderGeometry args={[0.13, 0.14, 0.42, 16]} />
          <meshStandardMaterial color={color} roughness={0.3} />
        </mesh>
        <Box
          position={[0, 0.25, 0]}
          size={[0.13, 0.08, 0.13]}
          color="#c2a36a"
          metalness={0.9}
        />
        <Box
          position={[0.055, 0.31, 0]}
          size={[0.18, 0.045, 0.045]}
          color="#b08f5b"
          metalness={0.8}
        />
        <Box
          position={[0, 0, 0.14]}
          size={[0.17, 0.18, 0.012]}
          color="#f6ebdf"
        />
      </group>
    );
  if (type === "jewelry")
    return (
      <group>
        <Box
          position={[0, -0.15, 0]}
          size={[0.56, 0.08, 0.6]}
          color="#4c4048"
        />
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.023, 8, 24]} />
          <meshStandardMaterial
            color="#cba151"
            metalness={0.95}
            roughness={0.15}
          />
        </mesh>
        <mesh position={[0, 0.04, 0.16]}>
          <octahedronGeometry args={[0.055]} />
          <meshStandardMaterial
            color="#f8ede0"
            metalness={0.4}
            roughness={0.05}
          />
        </mesh>
      </group>
    );
  if (type === "electronics")
    return (
      <group>
        <Box position={[0, 0.12, 0]} size={[0.5, 0.6, 0.07]} color="#25232b" />
        <Box
          position={[0, 0.13, 0.042]}
          size={[0.44, 0.51, 0.015]}
          color={color}
          metalness={0.3}
          roughness={0.18}
        />
        <Box
          position={[0, -0.22, 0]}
          size={[0.3, 0.035, 0.3]}
          color="#81818c"
          metalness={0.7}
        />
      </group>
    );
  if (type === "furniture")
    return (
      <group>
        <Box position={[0, 0.02, 0]} size={[0.58, 0.2, 0.45]} color={color} />
        <Box
          position={[0, 0.21, -0.15]}
          size={[0.58, 0.3, 0.08]}
          color={color}
        />
        {[-0.24, 0.24].map((x) => (
          <Box
            key={x}
            position={[x, 0.13, 0]}
            size={[0.09, 0.25, 0.45]}
            color={color}
          />
        ))}
        {[-0.22, 0.22].map((x) => (
          <Pole key={x} position={[x, -0.14, 0]} height={0.14} radius={0.018} />
        ))}
      </group>
    );
  return <Box position={[0, 0, 0]} size={[0.5, 0.55, 0.5]} color={color} />;
}
