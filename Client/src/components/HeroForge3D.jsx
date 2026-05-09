import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Trail } from "@react-three/drei";
import * as THREE from "three";
import { EffectComposer, Bloom, ChromaticAberration } from "@react-three/postprocessing";
import { CHAINS } from "../constants/chains.js";

function throughputPulse(apiCallsToday = 0) {
  const n = Math.min(1, Math.log10(1 + apiCallsToday) / 5);
  return 0.25 + n * 1.75;
}

/** Single orb + ribbon trail following CHAIN brand color */
function ChainOrb({ index, total, color, radius, speed }) {
  const meshRef = useRef(null);
  const col = useMemo(() => new THREE.Color(color), [color]);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime * speed + (index / total) * Math.PI * 2;
    meshRef.current.position.set(
      Math.cos(t) * radius,
      Math.sin(t * 0.72) * 0.42,
      Math.sin(t) * radius,
    );
  });
  return (
    <Trail
      width={0.09}
      length={28}
      color={col}
      decay={0.94}
      stride={0.02}
      attenuation={(w) => w * w}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial
          color={col}
          emissive={col}
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
    </Trail>
  );
}

function ForgeAnvil({ pulse }) {
  const meshRef = useRef(null);
  const groupRef = useRef(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const e = pulse * (0.85 + Math.sin(t * 2.2) * 0.12);
    const m = meshRef.current?.material;
    if (m) m.emissiveIntensity = e;
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.35) * 0.06;
    }
  });
  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.15, 0.22, 0.75]} />
        <meshStandardMaterial
          color="#2a2a30"
          metalness={0.65}
          roughness={0.38}
          emissive="#6366f1"
          emissiveIntensity={0.9}
        />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.55, 0.35, 0.55]} />
        <meshStandardMaterial color="#3f3f48" metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[1.45, 0.12, 1.0]} />
        <meshStandardMaterial color="#1a1a1d" metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Scene({ apiCallsToday }) {
  const rootRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });
  const { camera } = useThree();

  const pulse = useMemo(() => throughputPulse(apiCallsToday), [apiCallsToday]);
  const chains = CHAINS.slice(0, 12);

  useEffect(() => {
    const on = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", on);
    return () => window.removeEventListener("mousemove", on);
  }, []);

  useFrame((state, delta) => {
    if (rootRef.current) rootRef.current.rotation.y += delta * 0.06;
    const tx = THREE.MathUtils.lerp(camera.position.x, mouse.current.x * 0.55, 0.04);
    const ty = THREE.MathUtils.lerp(camera.position.y, 1.15 + mouse.current.y * 0.35, 0.04);
    const tz = THREE.MathUtils.lerp(camera.position.z, 4.2 + mouse.current.y * 0.15, 0.04);
    camera.position.set(tx, ty, tz);
    camera.lookAt(0, 0.2, 0);
  });

  return (
    <>
      <color attach="background" args={["#0A0A0B"]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 3]} intensity={1.1} castShadow />
      <pointLight position={[-3, 2, -2]} intensity={0.6} color="#6366F1" />
      <Environment preset="city" environmentIntensity={0.85} />
      <group ref={rootRef}>
        {chains.map((c, i) => (
          <ChainOrb
            key={c.id}
            index={i}
            total={chains.length}
            color={c.color}
            radius={1.55 + (i % 3) * 0.06}
            speed={0.28 + (i % 4) * 0.02}
          />
        ))}
        <ForgeAnvil pulse={pulse} />
      </group>
      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={0.25} mipmapBlur intensity={1.15} />
        <ChromaticAberration offset={[0.0012, 0.0018]} />
      </EffectComposer>
    </>
  );
}

export default function HeroForge3D({ apiCallsToday = 0 }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        alpha: false,
      }}
      camera={{ position: [0, 1.1, 4.35], fov: 42, near: 0.1, far: 40 }}
      style={{ width: "100%", height: "min(72vh, 640px)", touchAction: "none" }}
    >
      <Scene apiCallsToday={apiCallsToday} />
    </Canvas>
  );
}
