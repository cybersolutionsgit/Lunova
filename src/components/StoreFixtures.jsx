import * as THREE from "three";
function Box({ position, size, color, ...props }) {
  return (
    <mesh position={position} {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}
function Pole({
  position,
  height = 3,
  radius = 0.035,
  rotation,
  color = "#b69565",
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, height, 12]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
    </mesh>
  );
}
function Glass({ position, size }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color="#d6e9ed"
        transparent
        opacity={0.1}
        depthWrite={false}
        roughness={0.15}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
export function FixtureShell({ type, theme }) {
  const glass = ["boutique", "bakery", "beauty", "jewelry"].includes(type);
  const counter = ["bakery", "beauty", "jewelry"].includes(type);
  const top = counter ? 1.6 : 3;
  return (
    <>
      <Box
        position={[0, counter ? 0.4 : 0.09, 0]}
        size={[2.3, counter ? 0.8 : 0.18, 1.1]}
        color={theme.surface}
      />
      {type === "shoes" && (
        <>
          <Box
            position={[0, 0.95, 0]}
            size={[2.1, 0.08, 0.95]}
            color={theme.metal}
          />
          <Box
            position={[0, 1.5, -0.48]}
            size={[2.1, 2.7, 0.05]}
            color={theme.surface}
          />
        </>
      )}
      {type === "electronics" && (
        <Box
          position={[0, 0.35, 0]}
          size={[2.1, 0.7, 1]}
          color={theme.surface}
        />
      )}
      {type === "general" && (
        <Box
          position={[0, 0.2, 0]}
          size={[2.1, 0.4, 1]}
          color={theme.surface}
        />
      )}
      {counter && (
        <Box
          position={[0, 0.84, 0]}
          size={[2.2, 0.08, 1.04]}
          color={theme.metal}
        />
      )}
      {type === "mart" ? (
        <>
          {[0.55, 1.15, 1.75].map((y) => (
            <Box
              key={y}
              position={[0, y, 0]}
              size={[2.2, 0.08, 1.05]}
              color={theme.metal}
            />
          ))}
          <Box
            position={[0, 1.1, -0.48]}
            size={[2.2, 2.2, 0.06]}
            color={theme.surface}
          />
        </>
      ) : type === "furniture" ? (
        <Box
          position={[0, 0.18, 0]}
          size={[2.3, 0.12, 1.1]}
          color={theme.metal}
        />
      ) : (
        <>
          {[-1.04, 1.04].map((x) => (
            <Pole
              key={x}
              position={[x, top / 2, 0]}
              height={top}
              color={theme.metal}
            />
          ))}
          <Pole
            position={[0, top, 0]}
            height={2.1}
            rotation={[0, 0, Math.PI / 2]}
            color={theme.metal}
          />
        </>
      )}
      {glass && (
        <>
          <Glass
            position={[0, counter ? 1.2 : 1.55, 0.53]}
            size={[2.15, counter ? 0.8 : 2.8, 0.025]}
          />
          {[-1.07, 1.07].map((x) => (
            <Glass
              key={x}
              position={[x, counter ? 1.2 : 1.55, 0]}
              size={[0.025, counter ? 0.8 : 2.8, 1.06]}
            />
          ))}
          <Glass position={[0, top, 0]} size={[2.15, 0.025, 1.06]} />
        </>
      )}
    </>
  );
}
export function FixtureProps({ type, product }) {
  const color = product?.color || "#8b5263";
  if (type === "boutique") return null;
  if (type === "shoes")
    return (
      <>
        {[-0.45, 0.05].map((x) => (
          <group key={x} position={[x, 1.05, 0.05]}>
            <Box
              position={[0, 0, 0]}
              size={[0.4, 0.08, 0.72]}
              color="#ece6de"
            />
            <mesh position={[0, 0.13, -0.07]} scale={[0.21, 0.18, 0.36]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        ))}
      </>
    );
  if (type === "bakery")
    return (
      <>
        {[-0.65, 0, 0.65].map((x) => (
          <mesh key={x} position={[x, 1.02, 0]} scale={[0.25, 0.19, 0.25]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color="#c78b4d" roughness={1} />
          </mesh>
        ))}
      </>
    );
  if (type === "mart")
    return (
      <>
        {[0.8, 1.4, 2].flatMap((y, row) =>
          [-0.7, 0, 0.7].map((x, i) => (
            <Box
              key={`${row}-${i}`}
              position={[x, y, 0]}
              size={[0.35, 0.4, 0.4]}
              color={i % 2 ? color : "#d7b576"}
            />
          )),
        )}
      </>
    );
  if (type === "beauty")
    return (
      <>
        {[-0.6, -0.2, 0.2].map((x, i) => (
          <group key={x} position={[x, 1.1, 0]}>
            <mesh>
              <cylinderGeometry args={[0.1, 0.12, 0.42, 12]} />
              <meshStandardMaterial color={i % 2 ? color : "#d4b486"} />
            </mesh>
            <Box
              position={[0, 0.25, 0]}
              size={[0.13, 0.1, 0.13]}
              color="#e9d6aa"
            />
          </group>
        ))}
      </>
    );
  if (type === "jewelry")
    return (
      <group position={[-0.4, 1.1, 0]}>
        <mesh scale={[0.28, 0.35, 0.16]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#e7d9cc" />
        </mesh>
        <mesh position={[0, 0, 0.17]}>
          <torusGeometry args={[0.16, 0.02, 8, 32]} />
          <meshStandardMaterial
            color="#cba151"
            metalness={0.9}
            roughness={0.25}
          />
        </mesh>
      </group>
    );
  if (type === "electronics")
    return (
      <group position={[-0.4, 1.3, 0]}>
        <Box position={[0, 0, 0]} size={[0.7, 0.5, 0.08]} color="#302f36" />
        <Box position={[0, 0, 0.05]} size={[0.61, 0.41, 0.02]} color={color} />
        <Pole position={[0, -0.38, 0]} height={0.3} />
        <Box
          position={[0, -0.55, 0]}
          size={[0.55, 0.04, 0.3]}
          color="#686572"
        />
      </group>
    );
  if (type === "furniture")
    return (
      <group position={[-0.3, 0.6, 0]}>
        {[-0.55, 0.55].flatMap((x) =>
          [-0.23, 0.23].map((z) => (
            <Pole
              key={`${x}-${z}`}
              position={[x, -0.32, z]}
              height={0.22}
              radius={0.035}
            />
          )),
        )}
        <Box position={[0, 0, 0]} size={[1.4, 0.45, 0.65]} color={color} />
        <Box
          position={[0, 0.4, -0.25]}
          size={[1.4, 0.55, 0.18]}
          color={color}
        />
        {[-0.65, 0.65].map((x) => (
          <Box
            key={x}
            position={[x, 0.25, 0]}
            size={[0.18, 0.4, 0.7]}
            color={color}
          />
        ))}
      </group>
    );
  return <Box position={[-0.4, 0.8, 0]} size={[0.7, 0.8, 0.6]} color={color} />;
}
export const photoPosition = (type) =>
  type === "mart"
    ? { position: [0.65, 2.35, 0.15], width: 0.65 }
    : type === "boutique"
      ? { position: [0, 1.6, 0.25], width: 1.45 }
      : ["bakery", "beauty", "jewelry"].includes(type)
        ? { position: [0.65, 1.18, 0.55], width: 0.6 }
        : { position: [0.65, 1.85, 0.16], width: 0.75 };
