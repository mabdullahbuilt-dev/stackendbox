"use client";
import { LazyMotion } from "motion/react";
import { useEffect } from "react";
import { onDocumentClick } from "@/lib/scrollToHash";
import { MotionProvider } from "@/lib/useMotionPreference";

const features = () => import("@/lib/motionFeatures").then((r) => r.default);

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, []);
  return (
    <MotionProvider>
      <LazyMotion features={features} strict={false}>
        {children}
      </LazyMotion>
    </MotionProvider>
  );
}
