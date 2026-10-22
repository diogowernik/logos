"use client";

import { createContext, useContext, useEffect, useState, useRef, useSyncExternalStore, type ReactNode } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type InstallState = {
  canInstall: boolean;
  manual: boolean;
  installed: boolean;
  installing: boolean;
  install: () => Promise<void>;
};
const PwaContext = createContext<InstallState | null>(null);

export function usePwaInstall() {
  const context = useContext(PwaContext);
  if (!context) throw new Error("PwaProvider ausente.");
  return context;
}

function environmentSnapshot() {
  if (window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone) return "installed";
  if (!window.isSecureContext) return "browser";
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "manual" : "browser";
}

function subscribeEnvironment(callback: () => void) {
  const standalone = window.matchMedia("(display-mode: standalone)");
  standalone.addEventListener("change", callback);
  return () => standalone.removeEventListener("change", callback);
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [didInstall, setDidInstall] = useState(false);
  const environment = useSyncExternalStore(subscribeEnvironment, environmentSnapshot, () => "browser");
  const standalone = didInstall || environment === "installed";
  const busy = useRef(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const installed = () => {
      setDidInstall(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    if (process.env.NODE_ENV === "production" && window.isSecureContext && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => { /* Installation remains optional when workers are unavailable. */ });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function install() {
    if (!prompt || busy.current) return;
    busy.current = true;
    setInstalling(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } finally {
      setPrompt(null);
      busy.current = false;
      setInstalling(false);
    }
  }

  return (
    <PwaContext.Provider value={{
      canInstall: !standalone && Boolean(prompt),
      manual: !standalone && environment === "manual" && !prompt,
      installed: standalone,
      installing,
      install,
    }}>
      {children}
    </PwaContext.Provider>
  );
}
