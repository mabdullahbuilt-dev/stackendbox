import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { copy } from "@/content/copy";

export const runtime = "nodejs";
export const alt = "StackEndBox | We build the systems businesses run on.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const mark = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), "public/brand/mark.png")).toString("base64")}`;
  const word = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), "public/brand/wordmark.png")).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#050605", color: "#F0F2F5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mark} width={64} height={76} alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={word} width={238} height={35} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, lineHeight: 1.02, letterSpacing: -3, fontWeight: 600, maxWidth: 980 }}>{copy.meta.ogTitle}</div>
          <div style={{ fontSize: 28, color: "#A2AAB5", maxWidth: 900 }}>Product engineering, AI and custom software, built end to end.</div>
        </div>
        <div style={{ display: "flex", height: 4, width: 160, background: "#ff7a1a" }} />
      </div>
    ),
    size,
  );
}
