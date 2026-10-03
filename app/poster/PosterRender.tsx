"use client";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { heroModules } from "@/components/hero/modules";
import type { HeroBus } from "@/components/hero/HeroObject";

const HeroObject = dynamic(() => import("@/components/hero/HeroObject"), { ssr: false });

export function PosterRender() {
  const bus = useRef<HeroBus>({ explode: 0, px: 0, py: 0 });
  const [done, setDone] = useState(false);
  const explode = typeof window === "undefined" ? 0 : Number(new URLSearchParams(location.search).get("e") ?? 0);
  return (
    <div style={{ width: 1600, height: 1600, background: "transparent" }} data-done={done}>
      <HeroObject bus={bus.current} modules={heroModules} hovered={null} onHover={() => {}} still={{ explode }} dpr={1} onReady={() => setTimeout(() => setDone(true), 1500)} />
    </div>
  );
}
