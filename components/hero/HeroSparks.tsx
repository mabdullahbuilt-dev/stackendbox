"use client";
import { useEffect, useRef } from "react";
import { onPointer } from "@/lib/chapters";
import { useMotionPreference } from "@/lib/useMotionPreference";

/**
 * Cursor wake effect. A tiny code fragment or spark appears behind the pointer, drifts and fades.
 * Desktop with a fine pointer only, honours reduced motion, never runs while the hero is off screen,
 * and only keeps a frame loop alive while particles exist.
 */
const GLYPHS = ["0", "1", "{", "}", "</>", "=>", "[]", "::", "&&", "0x"];
type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; g: string | null; hue: number };

export function HeroSparks() {
  const { reduced } = useMotionPreference();
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduced) return;
    const cv = canvas.current;
    const host = cv?.parentElement?.parentElement; // .hero__sticky
    if (!cv || !host) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)").matches) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    let w = 0, h = 0, raf = 0, visible = true, last = 0;
    const parts: P[] = [];
    const size = () => {
      const r = host.getBoundingClientRect();
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(host);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (!visible) { parts.length = 0; ctx.clearRect(0, 0, w, h); } });
    io.observe(host);

    const frame = (t: number) => {
      raf = 0;
      const dt = Math.min(48, t - last || 16); last = t;
      ctx.clearRect(0, 0, w, h);
      ctx.font = "11px ui-monospace, Menlo, monospace";
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        const k = 1 - p.life / p.max;
        ctx.globalAlpha = Math.min(0.75, k * 0.9);
        ctx.fillStyle = p.hue === 1 ? "#2fd27a" : "#ff963f";
        if (p.g) ctx.fillText(p.g, p.x, p.y);
        else { ctx.beginPath(); ctx.arc(p.x, p.y, 1.1 + k, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      if (parts.length) raf = requestAnimationFrame(frame);
    };
    // The shared pointer engine calls this (one rAF, active chapter only). No listener of our own.
    let lastCall = 0;
    const onMove = (cx: number, cy: number, chapter: string) => {
      if (chapter !== "hero" || !visible) return;
      const now = performance.now();
      if (now - lastCall < 55) return;
      lastCall = now;
      const r = host.getBoundingClientRect();
      const x = cx - r.left, y = cy - r.top;
      if (y < 0 || y > h) return;
      if (parts.length > 36) return;
      const glyph = Math.random() < 0.55;
      parts.push({ x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 14, vx: (Math.random() - 0.5) * 0.02, vy: -0.015 - Math.random() * 0.025, life: 0, max: 650 + Math.random() * 450, g: glyph ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : null, hue: Math.random() < 0.18 ? 1 : 0 });
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    const off = onPointer(onMove);
    return () => { off(); cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [reduced]);

  return <canvas ref={canvas} className="hero__sparks" aria-hidden />;
}
