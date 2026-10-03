import * as THREE from "three";

/**
 * Procedural surface artwork in the idiom of the StackEndBox mark:
 * circuit traces, code glyphs, binary/hex rows. New drawing; not a trace of the logo file.
 */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 0xffffffff;
  };
}

const INK = "237,241,245";

function trace(ctx: CanvasRenderingContext2D, r: () => number, w: number, h: number, step: number, count: number) {
  ctx.lineWidth = 1.6;
  for (let i = 0; i < count; i++) {
    let x = Math.round((r() * w) / step) * step;
    let y = Math.round((r() * h) / step) * step;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 3 + Math.floor(r() * 5);
    let dir = Math.floor(r() * 4);
    for (let s = 0; s < segs; s++) {
      const len = step * (1 + Math.floor(r() * 4));
      const dx = [1, 0, -1, 0][dir] * len;
      const dy = [0, 1, 0, -1][dir] * len;
      x += dx; y += dy;
      ctx.lineTo(x, y);
      if (r() < 0.5) {
        // 45° bend
        const b = step * 0.8;
        x += (dx ? Math.sign(dx) : r() < 0.5 ? 1 : -1) * b;
        y += (dy ? Math.sign(dy) : r() < 0.5 ? 1 : -1) * b;
        ctx.lineTo(x, y);
      }
      dir = (dir + (r() < 0.5 ? 1 : 3)) % 4;
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 3.4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function toTexture(canvas: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

export function makeTopTexture(seed: number, size = 768) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const r = rng(seed * 9973 + 17);
  ctx.strokeStyle = `rgba(${INK},0.85)`;
  ctx.fillStyle = `rgba(${INK},0.9)`;
  trace(ctx, r, size, size, size / 32, 46);
  ctx.font = `600 ${size / 28}px ui-monospace, Menlo, monospace`;
  const glyphs = ["</>", "{}", "0xAF", "3C", "[ ]", "=>", "0x1B"];
  for (let i = 0; i < 9; i++) ctx.fillText(glyphs[Math.floor(r() * glyphs.length)], r() * size * 0.85, r() * size * 0.9 + 30);
  // inner panel with binary rows echoing the mark's top face
  ctx.fillStyle = `rgba(${INK},0.6)`;
  ctx.font = `${size / 40}px ui-monospace, Menlo, monospace`;
  for (let row = 0; row < 6; row++) {
    let s = "";
    for (let k = 0; k < 26; k++) s += r() < 0.5 ? "0" : "1";
    ctx.fillText(s, size * 0.12, size * 0.4 + row * (size / 34));
  }
  return toTexture(c);
}

/** Side faces. `bin` = binary/hex rows + module label, `circuit` = traces. */
export function makeSideTexture(seed: number, variant: "bin" | "circuit", label: string) {
  // drawn in a 2048×256 design space, rasterised at 75% to cut upload cost
  const w = 2048;
  const h = 256;
  const c = document.createElement("canvas");
  c.width = w * 0.75;
  c.height = h * 0.75;
  const ctx = c.getContext("2d")!;
  ctx.scale(0.75, 0.75);
  const r = rng(seed * 7919 + 3);
  if (variant === "circuit") {
    ctx.strokeStyle = `rgba(${INK},0.7)`;
    trace(ctx, r, w, h, 32, 30);
  } else {
    ctx.fillStyle = `rgba(${INK},0.55)`;
    ctx.font = "500 26px ui-monospace, Menlo, monospace";
    for (let row = 0; row < 7; row++) {
      let s = "";
      for (let k = 0; k < 90; k++) s += r() < 0.5 ? "0" : "1";
      ctx.fillText(s, 20, 34 + row * 34);
    }
    ctx.fillStyle = "rgba(21,25,31,0.92)";
    ctx.fillRect(40, 70, label.length * 40 + 60, 110);
    ctx.fillStyle = `rgba(${INK},0.9)`;
    ctx.font = "600 64px ui-monospace, Menlo, monospace";
    ctx.fillText(label, 70, 148);
  }
  // scan lines
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 1);
  return toTexture(c);
}
