"use client";
import { useEffect, useMemo, useState } from "react";
type Operation = "markdown" | "epub" | "local" | "export" | "files" | "cover";
export function useBookBusy(onBusy: (busy: boolean) => void) {
  const [operations, setOperations] = useState<Partial<Record<Operation, boolean>>>({});
  const busy = Object.values(operations).some(Boolean);
  const callbacks = useMemo(() => Object.fromEntries(
    ["markdown", "epub", "local", "export", "files", "cover"].map(name => [name, (active: boolean) => {
      setOperations(current => current[name as Operation] === active ? current : {...current, [name]: active});
    }]),
  ) as Record<Operation, (active: boolean) => void>, []);
  useEffect(() => { onBusy(busy); return () => onBusy(false); }, [busy, onBusy]);
  return {busy, callbacks};
}
