"use client";
import { useEffect } from "react";
import { startChapters, startPointer } from "@/lib/chapters";
import { useMotionPreference } from "@/lib/useMotionPreference";

/** Mounts the chapter runtime and the pointer engine once. Renders nothing. */
export function ChapterRuntime() {
  const { reduced } = useMotionPreference();
  useEffect(() => {
    const stop = startChapters();
    const stopPtr = reduced ? () => {} : startPointer();
    return () => { stopPtr(); stop(); };
  }, [reduced]);
  return null;
}
