"use client";
import { useEffect } from "react";
import { onDocumentClick } from "@/lib/scrollToHash";
import { MotionProvider } from "@/lib/useMotionPreference";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, []);
  return (
    <MotionProvider>
      {children}
    </MotionProvider>
  );
}
