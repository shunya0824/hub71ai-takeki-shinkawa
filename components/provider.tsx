"use client";
import { createContext, useContext, useEffect, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { emptyCase } from "@/lib/demo";
import { storageKey, serializeCase, deserializeCase } from "@/lib/storage";
import type { RelocationCase } from "@/lib/schema";

type Context = {
  data: RelocationCase; setData: Dispatch<SetStateAction<RelocationCase>>;
  ready: boolean; mode: "demo" | "live"; simulateFailure: boolean; setSimulateFailure: (value: boolean) => void;
  storageError: string; reset: () => void;
};
const CaseContext = createContext<Context | null>(null);
export function CaseProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(emptyCase);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try { const saved = localStorage.getItem(storageKey); if (saved) setData(deserializeCase(saved)); }
    catch { setStorageError("Saved data could not be read. You can start a new demo or reset the saved data."); }
    setReady(true);
    fetch("/api/status").then(response => response.json()).then(result => setMode(result.mode === "live" ? "live" : "demo")).catch(() => {});
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, serializeCase(data)); }
    catch { setStorageError("Browser storage is unavailable. This session still works, but changes will not survive a reload."); }
  }, [data, ready]);
  function reset() {
    try { localStorage.removeItem(storageKey); setStorageError(""); } catch { setStorageError("Browser storage could not be cleared."); }
    setData(emptyCase()); setSimulateFailure(false);
  }
  return <CaseContext.Provider value={{ data, setData, ready, mode, simulateFailure, setSimulateFailure, storageError, reset }}>{children}</CaseContext.Provider>;
}
export function useCase() { const context = useContext(CaseContext); if (!context) throw new Error("Missing case provider."); return context; }
export async function callApi<T>(action: string, body: unknown, simulateFailure = false): Promise<T> {
  const response = await fetch(`/api/${action}`, { method: "POST", headers: { "Content-Type": "application/json", ...(simulateFailure ? { "x-demo-failure": "1" } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(75000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The request failed. Please retry.");
  return result as T;
}
