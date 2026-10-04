"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, PerformanceMonitor, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { makeSideTexture, makeTopTexture } from "./circuitTexture";
import type { HeroModule } from "./modules";

/**
 * Mutable bus written by DOM/GSAP code and read inside the render loop (never React state).
 * explode 0..1 (small, contained separation), zoom 0..1 (camera closer), active slab index (-1 none),
 * pulse 0..1 (bottom to top), settle 0..1 (final 6 degree turn).
 */
export type HeroBus = { explode: number; zoom: number; active: number; pulse: number; settle: number; px: number; py: number; invalidate?: () => void };

const W = 1.6;
const H = 0.19;
const D = 1.6;
const SEAM = 0.012;
/** Max extra gap per slab: about 16px at the default stage size, so the stack stays inside its frame. */
const GAP = 0.07;
const GREEN = new THREE.Color("#2fd27a");
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
  lite?: boolean;
  onReady?: () => void;
  onDegrade?: () => void;
};

type Accent = { a: THREE.MeshBasicMaterial | null; b: THREE.MeshBasicMaterial | null };

function Slab({ index, mod, seed, hovered, onHover, innerRef, stillMode, accents }: {
  index: number; mod: HeroModule; seed: number; hovered: boolean; stillMode: boolean; accents: React.MutableRefObject<Accent[]>;
  onHover: (i: number | null) => void; innerRef: (g: THREE.Group | null) => void;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const [tex, setTex] = useState<{ top: THREE.Texture; circuit: THREE.Texture; bin: THREE.Texture } | null>(null);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(W - 0.01, H - 0.004, D - 0.01)), []);
  // Surface art is generated per slab in staggered tasks so no single task blocks the main thread.
  useEffect(() => {
    let made: THREE.Texture[] = [];
    const run = () => {
      const t = { top: makeTopTexture(seed), circuit: makeSideTexture(seed + 31, "circuit", mod.name), bin: makeSideTexture(seed + 57, "bin", mod.name) };
      made = [t.top, t.circuit, t.bin];
      setTex(t);
      invalidate();
    };
    const id = window.setTimeout(run, stillMode ? 0 : 60 + index * 70);
    return () => { window.clearTimeout(id); made.forEach((t) => t.dispose()); };
  }, [seed, mod.name, index, invalidate, stillMode]);
  useEffect(() => () => edges.dispose(), [edges]);

  return (
    <group
      ref={innerRef}
      onPointerOver={(e) => { e.stopPropagation(); onHover(index); }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => { e.stopPropagation(); onHover(hovered ? null : index); }}
    >
      <RoundedBox args={[W, H, D]} radius={0.025} smoothness={2}>
        <meshStandardMaterial color="#33362f" roughness={0.46} metalness={0.5} />
      </RoundedBox>
      {tex && (
        <>
          <mesh rotation-x={-Math.PI / 2} position={[0, H / 2 + 0.0016, 0]}>
            <planeGeometry args={[W - 0.08, D - 0.08]} />
            <meshBasicMaterial map={tex.top} transparent depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
          <mesh position={[0, 0, D / 2 + 0.0016]}>
            <planeGeometry args={[W - 0.08, H - 0.04]} />
            <meshBasicMaterial map={tex.circuit} transparent depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
          <mesh rotation-y={Math.PI / 2} position={[W / 2 + 0.0016, 0, 0]}>
            <planeGeometry args={[D - 0.08, H - 0.04]} />
            <meshBasicMaterial map={tex.bin} transparent depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        </>
      )}
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#E8EAE5" transparent opacity={0.6} />
      </lineSegments>
      <mesh position={[0, H / 2 - 0.005, D / 2 + 0.003]}>
        <boxGeometry args={[W - 0.06, 0.008, 0.004]} />
        <meshBasicMaterial ref={(m) => { (accents.current[index] ??= { a: null, b: null }).a = m; }} color={mod.accent} transparent opacity={mod.accentOpacity} toneMapped={false} />
      </mesh>
      <mesh position={[W / 2 + 0.003, H / 2 - 0.005, 0]}>
        <boxGeometry args={[0.004, 0.008, D - 0.06]} />
        <meshBasicMaterial ref={(m) => { (accents.current[index] ??= { a: null, b: null }).b = m; }} color={mod.accent} transparent opacity={mod.accentOpacity} toneMapped={false} />
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
  const pulse = useRef<THREE.Mesh>(null);
  const slabs = useRef<(THREE.Group | null)[]>([]);
  const accents = useRef<Accent[]>([]);
  const hoverAmt = useRef<number[]>(Array(n).fill(0));
  const baseCols = useRef<THREE.Color[]>(modules.map((m) => new THREE.Color(m.accent)));
  const actAmt = useRef<number[]>(Array(n).fill(0));
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
    const k = 1 - Math.pow(1 - 0.06, dt * 60);

    // pointer response: 2 to 3 degrees maximum
    const tx = still ? 0 : bus.py * THREE.MathUtils.degToRad(2.5);
    const ty = still ? 0 : bus.px * THREE.MathUtils.degToRad(3) + (still ? 0 : bus.settle) * THREE.MathUtils.degToRad(6);
    rot.current.x += (tx - rot.current.x) * k;
    rot.current.y += (ty - rot.current.y) * k;
    if (Math.abs(tx - rot.current.x) > 1e-4 || Math.abs(ty - rot.current.y) > 1e-4) busy = true;

    const breath = still ? 0 : Math.sin((state.clock.elapsedTime / 12) * Math.PI * 2) * 0.003;
    const act = still ? -1 : bus.active;

    for (let i = 0; i < n; i++) {
      const g = slabs.current[i];
      if (!g) continue;
      const fromBottom = n - 1 - i;
      const ee = rawE * rawE * (3 - 2 * rawE);
      let y = fromBottom * (H + SEAM + breath) + fromBottom * GAP * ee;
      if (animateIn && !still) {
        const a = clamp01((t - fromBottom * 0.07) / 0.9);
        if (a < 1) busy = true;
        y += (1 - easeOut(a)) * 1.2;
      }
      const target = hv === i ? 1 : 0;
      hoverAmt.current[i] += (target - hoverAmt.current[i]) * (1 - Math.pow(1 - 0.18, dt * 60));
      if (Math.abs(target - hoverAmt.current[i]) > 0.002) busy = true;
      y += hoverAmt.current[i] * 0.12;
      // activation: the active layer lifts a touch and its edge light brightens
      const at = act === i ? 1 : 0;
      actAmt.current[i] += (at - actAmt.current[i]) * (1 - Math.pow(1 - 0.2, dt * 60));
      if (Math.abs(at - actAmt.current[i]) > 0.003) busy = true;
      y += actAmt.current[i] * 0.03;
      const ac = accents.current[i];
      if (ac) {
        const o = Math.min(1, modules[i].accentOpacity + actAmt.current[i] * 0.6);
        // BUILD is orange, CONNECTED is green: a layer the signal has reached turns green, and the
        // delivery layer stays green once the stack settles (the LIVE state).
        const reached = !still && rawE > 0.3 && bus.pulse * n > fromBottom + 0.5;
        const live = !still && bus.settle > 0.5 && i === 0;
        const col = reached || live ? GREEN : baseCols.current[i];
        if (ac.a) { ac.a.opacity = o; ac.a.color.lerp(col, 0.25); }
        if (ac.b) { ac.b.opacity = o; ac.b.color.lerp(col, 0.25); }
        if (ac.a && (Math.abs(ac.a.color.r - col.r) + Math.abs(ac.a.color.g - col.g) + Math.abs(ac.a.color.b - col.b)) > 0.01) busy = true;
      }
      g.position.y += (y - g.position.y) * (still || !animateIn ? 1 : 1 - Math.pow(1 - 0.35, dt * 60));
      if (Math.abs(y - g.position.y) > 0.0008) busy = true;
    }

    if (rig.current) {
      rig.current.rotation.x = rot.current.x;
      rig.current.rotation.y = rot.current.y;
      rig.current.scale.setScalar(1 + 0.05 * (still ? 0 : bus.zoom));
      // keep the opened stack centred in its frame
      rig.current.position.y = -0.5 * (n - 1) * GAP * (rawE * rawE * (3 - 2 * rawE));
    }
    if (pulse.current) {
      const on = !still && bus.pulse > 0.001 && bus.pulse < 0.999 && rawE > 0.5;
      pulse.current.visible = on;
      if (on) {
        const top = (n - 1) * (H + SEAM) + (n - 1) * GAP * rawE;
        pulse.current.position.y = top * bus.pulse;
      }
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
          stillMode={!!still}
          accents={accents}
          hovered={hovered === i}
          onHover={onHover}
          innerRef={(g) => { slabs.current[i] = g; if (g && g.position.y === 0) g.position.y = (n - 1 - i) * (H + SEAM) + (still ? 0 : 1.2); }}
        />
      ))}
      {/* signal travelling through the layers: a thin orange plane, no arrows */}
      <mesh ref={pulse} visible={false}>
        <boxGeometry args={[W + 0.04, 0.005, D + 0.04]} />
        <meshBasicMaterial color="#ff7a1a" transparent opacity={0.32} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function HeroObject(props: Props) {
  const { dpr = 1.5, frameloop = "demand", still, onDegrade, lite } = props;
  return (
    <Canvas
      frameloop={frameloop}
      dpr={[1, Math.min(dpr, 1.5)]}
      camera={{ fov: 28, position: [4.6, 3.7, 4.6], near: 0.1, far: 50 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: !!still }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0, 0.7, 0);
        // a lost WebGL context drops back to the poster instead of a blank or looping canvas
        gl.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); onDegrade?.(); }, { once: true });
      }}
      onPointerMissed={() => props.onHover(null)}
      aria-hidden
      style={{ background: "transparent" }}
    >
      {!still && onDegrade && <PerformanceMonitor flipflops={2} onDecline={onDegrade} bounds={() => [40, 120]} />}
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 2]} intensity={0.6} />
      <Environment resolution={lite ? 64 : 128} frames={1}>
        <Lightformer form="rect" intensity={7} color="#f4f1ea" position={[4, 5, 3]} scale={[10, 5, 1]} rotation-x={-0.9} />
        <Lightformer form="rect" intensity={0.5} color="#ff7a1a" position={[-6, 2, -1]} scale={[6, 6, 1]} rotation-y={1.2} />
        <Lightformer form="ring" intensity={1.2} color="#ffffff" position={[0, 8, 0]} scale={4} rotation-x={Math.PI / 2} />
      </Environment>
      <Stack {...props} />
    </Canvas>
  );
}
