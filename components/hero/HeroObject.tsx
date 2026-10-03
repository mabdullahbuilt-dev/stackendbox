"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, PerformanceMonitor, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { makeSideTexture, makeTopTexture } from "./circuitTexture";
import type { HeroModule } from "./modules";

/** Mutable bus written by DOM/GSAP code, read inside the render loop (never React state). */
export type HeroBus = { explode: number; px: number; py: number; invalidate?: () => void };

const W = 1.6;
const H = 0.19;
const D = 1.6;
const SEAM = 0.012;
const GAP = 0.3;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

type Props = {
  bus: HeroBus;
  modules: HeroModule[];
  hovered: number | null;
  onHover: (i: number | null) => void;
  /** Static render for poster generation. */
  still?: { explode: number };
  animateIn?: boolean;
  frameloop?: "demand" | "never";
  dpr?: number;
  onReady?: () => void;
  onDegrade?: () => void;
};

function Slab({ index, mod, seed, hovered, onHover, innerRef }: {
  index: number; mod: HeroModule; seed: number; hovered: boolean;
  onHover: (i: number | null) => void; innerRef: (g: THREE.Group | null) => void;
}) {
  const top = useMemo(() => makeTopTexture(seed), [seed]);
  const circuit = useMemo(() => makeSideTexture(seed + 31, "circuit", mod.name), [seed, mod.name]);
  const bin = useMemo(() => makeSideTexture(seed + 57, "bin", mod.name), [seed, mod.name]);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(W - 0.01, H - 0.004, D - 0.01)), []);
  useEffect(() => () => { top.dispose(); circuit.dispose(); bin.dispose(); edges.dispose(); }, [top, circuit, bin, edges]);

  return (
    <group
      ref={innerRef}
      onPointerOver={(e) => { e.stopPropagation(); onHover(index); }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => { e.stopPropagation(); onHover(hovered ? null : index); }}
    >
      <RoundedBox args={[W, H, D]} radius={0.025} smoothness={2}>
        <meshStandardMaterial color="#2A2F37" roughness={0.5} metalness={0.45} />
      </RoundedBox>
      <mesh rotation-x={-Math.PI / 2} position={[0, H / 2 + 0.0016, 0]}>
        <planeGeometry args={[W - 0.08, D - 0.08]} />
        <meshBasicMaterial map={top} transparent depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh position={[0, 0, D / 2 + 0.0016]}>
        <planeGeometry args={[W - 0.08, H - 0.04]} />
        <meshBasicMaterial map={circuit} transparent depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh rotation-y={Math.PI / 2} position={[W / 2 + 0.0016, 0, 0]}>
        <planeGeometry args={[D - 0.08, H - 0.04]} />
        <meshBasicMaterial map={bin} transparent depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#EDF1F5" transparent opacity={0.5} />
      </lineSegments>
      {/* edge accent: a thin emissive line on the two front top edges only */}
      <mesh position={[0, H / 2 - 0.005, D / 2 + 0.003]}>
        <boxGeometry args={[W - 0.06, 0.008, 0.004]} />
        <meshBasicMaterial color={mod.accent} transparent opacity={mod.accentOpacity} toneMapped={false} />
      </mesh>
      <mesh position={[W / 2 + 0.003, H / 2 - 0.005, 0]}>
        <boxGeometry args={[0.004, 0.008, D - 0.06]} />
        <meshBasicMaterial color={mod.accent} transparent opacity={mod.accentOpacity} toneMapped={false} />
      </mesh>
      {hovered && (
        <Html position={[W / 2 + 0.2, 0.05, D / 2 - 0.1]} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="hero-chip">
            <strong>{mod.name}</strong>
            <span>{mod.sub}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function Stack({ bus, modules, hovered, onHover, still, animateIn = true, onReady }: Props) {
  const invalidate = useThree((s) => s.invalidate);
  const n = modules.length;
  const rig = useRef<THREE.Group>(null);
  const slabs = useRef<(THREE.Group | null)[]>([]);
  const hoverAmt = useRef<number[]>(Array(n).fill(0));
  const rot = useRef({ x: 0, y: 0 });
  const t0 = useRef<number | null>(null);
  const frames = useRef(0);
  const readyFired = useRef(false);
  const hoveredRef = useRef(hovered);
  hoveredRef.current = hovered;

  useEffect(() => {
    bus.invalidate = invalidate;
    invalidate();
    return () => { bus.invalidate = undefined; };
  }, [bus, invalidate]);
  useEffect(() => { invalidate(); }, [hovered, invalidate]);

  useFrame((state, dt) => {
    const rawE = still ? still.explode : bus.explode;
    const hv = hoveredRef.current;
    let busy = false;
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - t0.current;

    // camera rig: damped pointer rotation (X ±2.5°, Y ±5°)
    const k = 1 - Math.pow(1 - 0.06, dt * 60);
    const tx = still ? 0 : bus.py * THREE.MathUtils.degToRad(2.5);
    const ty = still ? 0 : bus.px * THREE.MathUtils.degToRad(5);
    rot.current.x += (tx - rot.current.x) * k;
    rot.current.y += (ty - rot.current.y) * k;
    if (Math.abs(tx - rot.current.x) > 1e-4 || Math.abs(ty - rot.current.y) > 1e-4) busy = true;

    const breath = still ? 0 : Math.sin((state.clock.elapsedTime / 12) * Math.PI * 2) * 0.004;

    for (let i = 0; i < n; i++) {
      const g = slabs.current[i];
      if (!g) continue;
      const fromBottom = n - 1 - i;
      // explode: top slab leads
      const e = clamp01(rawE * (1 + 0.04 * (n - 1)) - 0.04 * i);
      const ee = e * e * (3 - 2 * e);
      let y = fromBottom * (H + SEAM + breath) + fromBottom * GAP * ee;
      // assemble-in
      if (animateIn && !still) {
        const a = clamp01((t - fromBottom * 0.07) / 0.9);
        if (a < 1) busy = true;
        y += (1 - easeOut(a)) * 1.2;
      }
      // hover lift + neighbour shift
      const target = hv === i ? 1 : 0;
      hoverAmt.current[i] += (target - hoverAmt.current[i]) * (1 - Math.pow(1 - 0.18, dt * 60));
      if (Math.abs(target - hoverAmt.current[i]) > 0.002) busy = true;
      y += hoverAmt.current[i] * 0.16;
      if (hv !== null) {
        const nb = i < hv ? 0.02 : i > hv ? -0.02 : 0;
        y += nb * (hv !== null ? 1 : 0);
      }
      g.position.y += (y - g.position.y) * (still || !animateIn ? 1 : 1 - Math.pow(1 - 0.35, dt * 60));
      if (Math.abs(y - g.position.y) > 0.0008) busy = true;
    }

    if (rig.current) {
      rig.current.rotation.x = rot.current.x;
      rig.current.rotation.y = rot.current.y;
      const s = 1 - 0.16 * rawE;
      rig.current.scale.setScalar(s);
      rig.current.position.y = -0.62 * rawE;
    }
    frames.current++;
    if (frames.current === 3 && !readyFired.current) {
      readyFired.current = true;
      onReady?.();
    }
    if (busy || frames.current < 4) invalidate();
  });

  return (
    <group ref={rig}>
      {modules.map((m, i) => (
        <Slab
          key={m.name}
          index={i}
          mod={m}
          seed={i + 1}
          hovered={hovered === i}
          onHover={onHover}
          innerRef={(g) => { slabs.current[i] = g; if (g && g.position.y === 0) g.position.y = (n - 1 - i) * (H + SEAM) + (still ? 0 : 1.2); }}
        />
      ))}
    </group>
  );
}

export default function HeroObject(props: Props) {
  const { dpr = 1.5, frameloop = "demand", still, onDegrade } = props;
  return (
    <Canvas
      frameloop={frameloop}
      dpr={[1, dpr]}
      camera={{ fov: 28, position: [4.6, 3.7, 4.6], near: 0.1, far: 50 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: !!still }}
      onCreated={({ camera }) => camera.lookAt(0, 0.7, 0)}
      onPointerMissed={() => props.onHover(null)}
      aria-hidden
      style={{ background: "transparent" }}
    >
      {!still && onDegrade && <PerformanceMonitor flipflops={2} onDecline={onDegrade} bounds={() => [40, 120]} />}
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 2]} intensity={0.6} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={7} color="#e8eefc" position={[4, 5, 3]} scale={[10, 5, 1]} rotation-x={-0.9} />
        <Lightformer form="rect" intensity={0.5} color="#4169FF" position={[-6, 2, -1]} scale={[6, 6, 1]} rotation-y={1.2} />
        <Lightformer form="ring" intensity={1.2} color="#ffffff" position={[0, 8, 0]} scale={4} rotation-x={Math.PI / 2} />
      </Environment>
      <Stack {...props} />
    </Canvas>
  );
}
