"use client";

import { useState } from "react";
import { DownloadIcon } from "@/components/icons/NavigationIcons";
import { errorMessage, libraryRequest } from "./api";
import type { EpubArtifact } from "./types";
import "./project-export.css";

export function ProjectExport({ projectId, artifact, hasContent, onChange }: {
  projectId: number; artifact: EpubArtifact | null; hasContent: boolean;
  onChange: (artifact: EpubArtifact) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setPending(true); setError("");
    try { onChange(await libraryRequest<EpubArtifact>(`projects/${projectId}/epub`, "POST")); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  return <section className="project-export" aria-label="EPUB">
    <div className="button-row">
      <button type="button" className="secondary" disabled={pending || !hasContent} onClick={generate}>
        {pending ? "Gerando EPUB…" : artifact ? "Gerar novamente" : "Gerar EPUB"}
      </button>
      {artifact && <a className="epub-download" href={artifact.url} download={artifact.filename}><DownloadIcon />Baixar EPUB</a>}
    </div>
    {artifact && <p className="epub-generated">Gerado em {new Date(artifact.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
