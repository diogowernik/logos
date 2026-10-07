"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { libraryRequest, errorMessage } from "./api";
import { useLibrary } from "./LibraryShell";
import type { TextSummary } from "./types";
import { ChevronIcon, ComposeIcon, FolderIcon, LibraryIcon, MoreIcon } from "@/components/icons/NavigationIcons";
import { SidebarSection } from "./SidebarSection";
import "./sidebar.css";

const textDragType = "application/x-logos-text";

export function LibrarySidebar() {
  const library = useLibrary();
  const router = useRouter();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);
  const [moving, setMoving] = useState<TextSummary | null>(null);
  const [pending, setPending] = useState(false);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function moveText(text: TextSummary, project: number) {
    if (text.project === project || pending) return;
    if (library.active?.text === text.id && library.guardRef.current && !library.guardRef.current()) return;
    setPending(true); setError("");
    try {
      await libraryRequest(`texts/${text.id}/move`, "POST", { project });
      await library.refresh();
      await library.loadContent(project);
      if (!text.is_loose) await library.loadContent(text.project);
      window.dispatchEvent(new Event("logos:library-change"));
      setMoving(null);
      if (library.active?.text === text.id) router.push(`/texts/${text.id}`);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  function submitMove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (moving) void moveText(moving, Number(new FormData(event.currentTarget).get("project")));
  }

  return <aside id="library-sidebar" className="workspace-sidebar" aria-label="Navegação da biblioteca">
    <Link className={`nav-button new-text ${pathname === "/texts/new" ? "active" : ""}`} href="/texts/new" onClick={(event) => {
      if (pathname === "/texts/new") {
        event.preventDefault();
        if (!library.guardRef.current || library.guardRef.current()) window.dispatchEvent(new Event("logos:new-text"));
      }
    }}><ComposeIcon /><span className="sidebar-label">Novo texto</span></Link>
    <Link className={`nav-button sidebar-primary ${pathname === "/" ? "active" : ""}`} href="/"><LibraryIcon /><span className="sidebar-label">Biblioteca</span></Link>
    <SidebarSection title="Projetos" open={projectsOpen} controls="sidebar-projects" onToggle={() => setProjectsOpen(!projectsOpen)} createHref="/?create=project" createLabel="Criar projeto" />
    <div id="sidebar-projects" hidden={!projectsOpen}>
    {library.projects.map((project) => {
      const open = expanded[project.id] ?? library.active?.project === project.id;
      const content = library.contents[project.id];
      return <div key={project.id}>
        <div className={`sidebar-project ${library.active?.project === project.id ? "active" : ""} ${dropTarget === project.id ? "drop-target" : ""}`}
          onDragOver={(event) => { if (event.dataTransfer.types.includes(textDragType)) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTarget(project.id); } }}
          onDragLeave={() => setDropTarget(null)} onDrop={(event) => {
            event.preventDefault(); setDropTarget(null);
            const text = library.recent.find((item) => item.id === Number(event.dataTransfer.getData(textDragType)));
            if (text) void moveText(text, project.id);
          }}>
          <button className="expand-project" aria-label={`${open ? "Recolher" : "Expandir"} ${project.title}`} aria-expanded={Boolean(open)} onClick={() => {
            setExpanded((current) => ({ ...current, [project.id]: !open }));
            if (!open && !content) void library.loadContent(project.id);
          }}><FolderIcon /><ChevronIcon collapsed={!open} /></button>
          <Link className="nav-button" href={`/projects/${project.id}`} title={project.title}><span className="sidebar-label">{project.title}</span></Link>
          <div className="sidebar-row-actions">
            <details className="action-menu"><summary aria-label={`Opções do projeto ${project.title}`}><MoreIcon /></summary><div><Link href={`/projects/${project.id}`}>Visão geral</Link><Link href={`/projects/${project.id}/read`}>Ler livro</Link></div></details>
            <Link className="sidebar-icon-action" href={`/projects/${project.id}/new`} aria-label={`Adicionar texto a ${project.title}`} title="Adicionar texto"><ComposeIcon /></Link>
          </div>
        </div>
        {open && <div className="sidebar-chapters">
          {content ? content.texts.filter((text) => text.parent === null).map((text) => <div key={text.id}>
            <Link className={`nav-button ${library.active?.text === text.id ? "active" : ""}`} href={`/texts/${text.id}`} title={text.title}>{text.title || "Sem título"}</Link>
            {content.texts.some((variation) => variation.parent === text.id) && <details className="sidebar-variations" open={content.texts.some((variation) => variation.parent === text.id && library.active?.text === variation.id) || undefined}><summary>Variações</summary>{content.texts.filter((variation) => variation.parent === text.id).map((variation) => <Link key={variation.id} className={`nav-button ${library.active?.text === variation.id ? "active" : ""}`} href={`/texts/${variation.id}`}>{variation.title || "Sem título"}</Link>)}</details>}
          </div>) : <p className="outline-empty">Carregando…</p>}
        </div>}
      </div>;
    })}
    </div>
    <SidebarSection title="Coleções" createHref="/?create=collection" createLabel="Criar coleção" />
    {library.collections.map((collection) => <Link className="nav-button sidebar-collection" key={collection.id} href={`/?collection=${collection.id}`} title={collection.title}><FolderIcon /><span className="sidebar-label">{collection.title}</span></Link>)}
    <SidebarSection title="Recentes" open={recentOpen} controls="sidebar-recents" onToggle={() => setRecentOpen(!recentOpen)} />
    <div id="sidebar-recents" hidden={!recentOpen}>
    {library.recent.map((text) => <div className="recent-row" key={text.id} draggable={!pending} onDragStart={(event) => { event.dataTransfer.setData(textDragType, String(text.id)); event.dataTransfer.effectAllowed = "move"; }}>
      <Link className={`nav-button ${library.active?.text === text.id ? "active" : ""}`} href={`/texts/${text.id}`} title={`${text.title || "Sem título"}${text.is_loose ? "" : ` · ${text.project_title}`}`}><span className="sidebar-label">{text.title || "Sem título"}</span></Link>
      <details className="action-menu"><summary aria-label={`Opções de ${text.title || "texto sem título"}`}><MoreIcon /></summary><div><button disabled={pending} onClick={() => { setError(""); setMoving(text); }}>{text.is_loose ? "Adicionar ao projeto…" : "Mover para…"}</button></div></details>
    </div>)}
    </div>
    {error && !moving && <p role="alert">{error}</p>}
    {moving && <div className="modal-backdrop"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="sidebar-move-title">
      <h2 id="sidebar-move-title">{moving.is_loose ? "Adicionar ao projeto" : "Mover texto"}</h2>
      {error && <p role="alert">{error}</p>}
      <form className="form-stack" onSubmit={submitMove}><label htmlFor="sidebar-destination">Projeto de destino</label><select name="project" id="sidebar-destination" required defaultValue=""><option value="" disabled>Escolha um projeto</option>{library.projects.filter((project) => project.id !== moving.project).map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select>
        {!library.projects.some((project) => project.id !== moving.project) && <p>Crie um projeto na biblioteca para organizar este texto.</p>}
        <div className="button-row"><button type="button" className="secondary" disabled={pending} onClick={() => setMoving(null)}>Cancelar</button><button disabled={pending || !library.projects.some((project) => project.id !== moving.project)}>Adicionar</button></div>
      </form>
    </section></div>}
  </aside>;
}
