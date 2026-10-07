"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { libraryRequest, errorMessage } from "./api";
import { useLibrary } from "./LibraryShell";
import type { Collection, Project, TextSummary } from "./types";
import { PrivateImage } from "@/components/PrivateImage";
import "./project-files.css";

export function Library({ collectionId = null, autofocus = false, createKind = null }: {
  collectionId?: number | null; autofocus?: boolean; createKind?: "project" | "collection" | null;
}) {
  const router = useRouter();
  const { projects, collections, loading, refresh } = useLibrary();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Project[] | null>(null);
  const [texts, setTexts] = useState<TextSummary[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<"project" | "collection" | null>(createKind);
  const [pending, setPending] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (autofocus) searchInput.current?.focus(); }, [autofocus]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const query = search.trim() ? `search=${encodeURIComponent(search.trim())}` : "loose=1";
        const [foundTexts, foundProjects] = await Promise.all([
          libraryRequest<TextSummary[]>(`texts?${query}`),
          search.trim() ? libraryRequest<Project[]>(`projects?${query}`) : Promise.resolve(null),
        ]);
        if (active) { setTexts(foundTexts); setSearchResults(foundProjects); }
      } catch (reason) { if (active) setError(errorMessage(reason)); }
    }, search.trim() ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [search, projects]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get("title") ?? "");
    setPending(true); setError("");
    try {
      if (creating === "collection") {
        const collection = await libraryRequest<Collection>("collections", "POST", { title });
        await refresh(); setCreating(null); router.push(`/?collection=${collection.id}`);
      } else {
        const project = await libraryRequest<Project>("projects", "POST", { title, collection: collectionId });
        await refresh(); router.push(`/projects/${project.id}`);
      }
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  const visible = (search.trim() ? searchResults ?? [] : projects).filter((project) => collectionId === null || project.collection === collectionId);
  const visibleTexts = collectionId === null ? texts : texts.filter((text) => projects.some((project) => project.id === text.project && project.collection === collectionId));
  const selectedCollection = collections.find((collection) => collection.id === collectionId);

  return <section className="library-main">
    {selectedCollection && <nav className="breadcrumbs" aria-label="Caminho"><Link href="/">Biblioteca</Link><span>/</span><span>{selectedCollection.title}</span></nav>}
    <div className="page-heading"><div><h1>{selectedCollection?.title ?? "Biblioteca"}</h1>{selectedCollection?.description && <p>{selectedCollection.description}</p>}</div><button onClick={() => setCreating("project")}>+ Projeto</button></div>
    <input ref={searchInput} aria-label="Buscar projetos e textos" placeholder="Buscar projetos e textos…" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setSearchResults(null); }} className="library-search" />
    {error && !creating && <p role="alert">{error}</p>}
    {!search.trim() && collectionId === null && collections.length > 0 && <section className="library-section"><h2>Coleções</h2><div className="project-grid collection-grid">{collections.map((collection) => <Link className="project-card collection-card" key={collection.id} href={`/?collection=${collection.id}`}><span className="card-art collection-art" aria-hidden="true">▦</span><h3>{collection.title}</h3><div className="project-card-footer">{projects.filter((project) => project.collection === collection.id).length} projetos</div></Link>)}</div></section>}
    {loading ? <p>Carregando biblioteca…</p> : <>
      {visible.length > 0 && <section className="library-section"><h2>Projetos</h2><div className="project-grid">
        {visible.map((project) => <Link className="project-card" href={`/projects/${project.id}`} key={project.id}>
          <span className="card-art" aria-hidden="true">{project.cover_url ? <PrivateImage className="book-cover" src={project.cover_url} alt="" /> : "¶"}</span><h3>{project.title}</h3>{project.subtitle && <p>{project.subtitle}</p>}
          <div className="project-card-footer"><span>{project.text_count} {project.text_count === 1 ? "texto" : "textos"}</span><span>{collections.find((collection) => collection.id === project.collection)?.title ?? ""}</span></div>
        </Link>)}
      </div></section>}
      {visibleTexts.length > 0 && <section className="library-section"><h2>{search.trim() ? "Textos encontrados" : "Textos soltos"}</h2><div className="library-texts">{visibleTexts.map((text) => <Link className="library-text" key={text.id} href={`/texts/${text.id}`}><span>{text.title || "Sem título"}</span>{!text.is_loose && <small>{text.project_title}</small>}</Link>)}</div></section>}
      {!visible.length && !visibleTexts.length && <div className="empty-state"><span className="empty-mark" aria-hidden="true">¶</span><h2>{search ? "Nenhum resultado encontrado" : "Seu próximo texto começa aqui"}</h2>
        {!search && <><p>Comece um texto ou crie um projeto para reunir seus capítulos.</p><div className="button-row"><Link className="button-link" href="/texts/new">✎ Novo texto</Link><button className="secondary" onClick={() => setCreating("project")}>+ Criar projeto</button></div></>}
      </div>}
    </>}
    {creating && <div className="modal-backdrop"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="create-heading">
      <h2 id="create-heading">{creating === "project" ? "Novo projeto" : "Nova coleção"}</h2>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={create} className="form-stack"><label htmlFor="new-title">Título</label><input id="new-title" name="title" autoFocus required={creating === "collection"} placeholder={creating === "project" ? "Sem título" : "Nome da coleção"} />
        <div className="button-row"><button type="button" className="secondary" onClick={() => { setCreating(null); if (createKind) router.push(collectionId ? `/?collection=${collectionId}` : "/"); }}>Cancelar</button><button disabled={pending}>{pending ? "Criando…" : "Criar"}</button></div>
      </form>
    </section></div>}
  </section>;
}
