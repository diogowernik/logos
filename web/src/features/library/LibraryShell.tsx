"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { libraryRequest, errorMessage } from "./api";
import type { Collection, Project, ProjectContent, TextSummary } from "./types";
import Alert from "@mui/material/Alert";
import { AppShell } from "@/components/shell/AppShell";
import { AppHeader } from "@/components/AppHeader";
import { LibrarySidebar } from "./LibrarySidebar";

function useLibraryState() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recent, setRecent] = useState<TextSummary[]>([]);
  const [contents, setContents] = useState<Record<number, ProjectContent>>({});
  const [active, setActive] = useState<{
    project: number;
    text: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const guardRef = useRef<(() => boolean) | null>(null);
  const refresh = useCallback(async () => {
    try {
      const [p, c, r] = await Promise.all([
        libraryRequest<Project[]>("projects"),
        libraryRequest<Collection[]>("collections"),
        libraryRequest<TextSummary[]>("texts/recent"),
      ]);
      setProjects(p);
      setCollections(c);
      setRecent(r);
      setError("");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const publish = useCallback((content: ProjectContent) => {
    setContents((current) => ({ ...current, [content.project.id]: content }));
  }, []);
  const loadContent = useCallback(
    async (id: number) => {
      try {
        publish(await libraryRequest<ProjectContent>(`projects/${id}/content`));
      } catch (reason) {
        setError(errorMessage(reason));
      }
    },
    [publish],
  );

  return {
    projects,
    collections,
    recent,
    contents,
    active,
    setActive,
    loading,
    error,
    setError,
    refresh,
    publish,
    loadContent,
    guardRef,
  };
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
  return (
    <LibraryContext.Provider value={state}>
      <AppShell
        header={<AppHeader />}
        left={<LibrarySidebar />}
        right={null}
        leftLabel="Navegação da biblioteca"
        rightLabel="Painel de trabalho"
      >
        {state.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {state.error}
          </Alert>
        )}
        {children}
      </AppShell>
    </LibraryContext.Provider>
  );
}
