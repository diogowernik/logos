"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ComposeIcon, ImageIcon } from "@/components/icons/NavigationIcons";
import { PrivateImage } from "@/components/PrivateImage";
import { errorMessage, libraryRequest } from "./api";
import type { Project } from "./types";
import "./project-files.css";

export function ProjectCover({ project, onChange }: { project: Project; onChange: (project: Project) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0];
    event.target.value = "";
    if (!image) return;
    const form = new FormData();
    form.append("image", image);
    setPending(true); setError("");
    try { onChange(await libraryRequest<Project>(`projects/${project.id}/cover`, "POST", form)); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  return <div className="cover-control">
    <button type="button" className="project-cover" aria-label={project.cover_url ? "Trocar capa" : "Adicionar capa"} aria-busy={pending} disabled={pending} onClick={() => input.current?.click()}>
      {project.cover_url ? <><PrivateImage className="project-cover-image" src={project.cover_url} alt={`Capa de ${project.title}`} /><span className="cover-change"><ComposeIcon />{pending ? "Enviando…" : "Trocar capa"}</span></> : <span className="cover-empty"><ImageIcon /><span>{pending ? "Enviando…" : "Adicionar capa"}</span></span>}
    </button>
    <input ref={input} type="file" aria-label="Arquivo de capa" accept="image/jpeg,image/png,image/webp" hidden disabled={pending} onChange={upload} />
    {error && <p className="cover-error" role="alert">{error}</p>}
  </div>;
}
