"use client";
import { LazyMotion } from "motion/react";
import { MotionProvider } from "@/lib/useMotionPreference";

const features = () => import("@/lib/motionFeatures").then((r) => r.default);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <LazyMotion features={features} strict={false}>
        {children}
      </LazyMotion>
    </MotionProvider>
  );
}
