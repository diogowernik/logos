"use client";
import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { libraryRequest, errorMessage } from "./api";
import { ProjectEditor } from "./ProjectEditor";
import type { Project, Text } from "./types";

export function OpenText({ textId }: { textId?: string }) {
  const [projectId, setProjectId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const id = textId
          ? (await libraryRequest<Text>(`texts/${textId}`)).project
          : (await libraryRequest<Project>("projects/inbox", "POST")).id;
        if (active) setProjectId(id);
      } catch (reason) {
        if (active) setError(errorMessage(reason));
      }
    }
    void load();
    window.addEventListener("logos:library-change", load);
    return () => {
      active = false;
      window.removeEventListener("logos:library-change", load);
    };
  }, [textId]);
  useEffect(() => {
    const reset = () => setDraft((current) => current + 1);
    window.addEventListener("logos:new-text", reset);
    return () => window.removeEventListener("logos:new-text", reset);
  }, []);
  if (projectId === null)
    return (
      <section>
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Typography>Abrindo texto…</Typography>
        )}
        {error && <Link href="/">Biblioteca</Link>}
      </section>
    );
  return (
    <ProjectEditor
      key={`${projectId}-${textId ?? "new"}-${draft}`}
      projectId={String(projectId)}
      initialView={textId ? "text" : "new"}
      initialTextId={textId ? Number(textId) : undefined}
    />
  );
}
