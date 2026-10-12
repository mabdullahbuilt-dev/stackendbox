"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Data } from "./Portal";
type Cache = { userId: string; section: string; data: Data; loadedAt: number } | null;
const Context = createContext<{ cache: Cache; save: (value: Cache) => void } | null>(null);
export function PortalCache({ children }: { children: ReactNode }) {
  const [cache, save] = useState<Cache>(null);
  return <Context.Provider value={{ cache, save }}>{children}</Context.Provider>;
}
export function usePortalCache() {
  const context = useContext(Context);
  if (!context) throw new Error("Portal cache provider missing");
  return context;
}
