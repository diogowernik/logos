"use client";

import { useState } from "react";
import { ImageIcon } from "@/components/icons/NavigationIcons";
import { PrivateImage } from "@/components/PrivateImage";
import { errorMessage, libraryRequest } from "./api";
import type { Asset, Project } from "./types";
import "./project-files.css";

export function ProjectFiles({ project, assets, onChange }: {
  project: Project; assets: Asset[]; onChange: (project: Project) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  if (!assets.length) return null;

  async function chooseCover(id: string | null) {
    setPending(true); setError("");
    try { onChange(await libraryRequest<Project>(`projects/${project.id}`, "PATCH", { cover: id })); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  return <section className="project-files" aria-labelledby="project-files-title">
    <div className="project-files-heading"><h2 id="project-files-title">Arquivos</h2>{project.cover && <button type="button" className="text-action" disabled={pending} onClick={() => chooseCover(null)}>Remover capa</button>}</div>
    {error && <p role="alert">{error}</p>}
    {assets.map((asset) => <div className="project-file" key={asset.id}>
      <PrivateImage className="project-file-thumbnail" src={asset.url} alt="" loading="lazy" />
      <a href={asset.url} target="_blank" rel="noreferrer">{asset.original_name}</a>
      {project.cover === asset.id ? <span className="project-file-role">Capa</span> : <button type="button" className="quiet-icon-button" aria-label={`Usar ${asset.original_name} como capa`} title="Usar como capa" disabled={pending} onClick={() => chooseCover(asset.id)}><ImageIcon /></button>}
    </div>)}
  </section>;
}
