"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { libraryRequest, errorMessage } from "./api";
import type { Collection, Project, ProjectContent, TextSummary } from "./types";
import { useMediaQuery } from "./useMediaQuery";
import { AppHeader } from "@/components/AppHeader";
import { LibrarySidebar } from "./LibrarySidebar";


function useLibraryState() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recent, setRecent] = useState<TextSummary[]>([]);
  const [contents, setContents] = useState<Record<number, ProjectContent>>({});
  const [active, setActive] = useState<{ project: number; text: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const guardRef = useRef<(() => boolean) | null>(null);
  const wide = useMediaQuery("(min-width: 1100px)");
  const [previewOverride, setPreviewOpen] = useState<boolean | null>(null);
  const previewOpen = previewOverride ?? wide;
  const [previewAvailable, setPreviewAvailable] = useState(false);
  const [previewHost, setPreviewHost] = useState<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [p, c, r] = await Promise.all([
        libraryRequest<Project[]>("projects"), libraryRequest<Collection[]>("collections"),
        libraryRequest<TextSummary[]>("texts/recent"),
      ]);
      setProjects(p); setCollections(c); setRecent(r); setError("");
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);

  const publish = useCallback((content: ProjectContent) => {
    setContents((current) => ({ ...current, [content.project.id]: content }));
  }, []);
  const loadContent = useCallback(async (id: number) => {
    try { publish(await libraryRequest<ProjectContent>(`projects/${id}/content`)); }
    catch (reason) { setError(errorMessage(reason)); }
  }, [publish]);

  return { projects, collections, recent, contents, active, setActive, loading, error, setError, refresh, publish, loadContent, guardRef,
    previewOpen, setPreviewOpen, previewAvailable, setPreviewAvailable, previewHost, setPreviewHost };
}

type LibraryState = ReturnType<typeof useLibraryState>;
const LibraryContext = createContext<LibraryState | null>(null);
export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("LibraryShell ausente.");
  return context;
}

export function LibraryShell({ children }: { children: ReactNode }) {
  const state = useLibraryState();
  const desktop = useMediaQuery("(min-width: 761px)");
  const [collapsedOverride, setCollapsed] = useState<boolean | null>(null);
  const collapsed = collapsedOverride ?? !desktop;
  const showPreview = state.previewAvailable && state.previewOpen;
  const { setPreviewHost } = state;
  const attachPreview = useCallback((node: HTMLDivElement | null) => setPreviewHost(node), [setPreviewHost]);
  return <LibraryContext.Provider value={state}>
    <AppHeader sidebarCollapsed={collapsed} onToggleSidebar={() => setCollapsed(!collapsed)} previewOpen={state.previewOpen} onTogglePreview={state.previewAvailable ? () => state.setPreviewOpen(!state.previewOpen) : undefined} />
    <div className={`library-shell ${collapsed ? "sidebar-collapsed" : ""} ${showPreview ? "preview-open" : ""}`} onClickCapture={(event) => {
      if (!desktop && !event.defaultPrevented && (event.target as HTMLElement).closest(".workspace-sidebar a[href]")) setCollapsed(true);
    }}>
      {!collapsed && <LibrarySidebar />}
      <main className="shell-main">{state.error && <p role="alert">{state.error}</p>}{children}</main>
      <aside id="text-preview" className="preview-sidebar" aria-label="Preview" hidden={!showPreview}><div ref={attachPreview} /></aside>
    </div>
  </LibraryContext.Provider>;
}

