"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { libraryRequest, errorMessage } from "./api";
import type { Collection, Project } from "./types";

export function Library() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<"project" | "collection" | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([libraryRequest<Project[]>("projects"), libraryRequest<Collection[]>("collections")])
      .then(([p, c]) => { if (active) { setProjects(p); setCollections(c); } })
      .catch((reason) => { if (active) setError(errorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!search.trim()) return;
    let active = true;
    const timer = setTimeout(() => {
      libraryRequest<Project[]>(`projects?search=${encodeURIComponent(search)}`)
        .then((results) => { if (active) setSearchResults(results); })
        .catch((reason) => { if (active) setError(errorMessage(reason)); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get("title") ?? "");
    setPending(true); setError("");
    try {
      if (creating === "collection") {
        const collection = await libraryRequest<Collection>("collections", "POST", { title });
        setCollections((current) => [...current, collection]); setSelected(collection.id); setCreating(null);
      } else {
        const project = await libraryRequest<Project>("projects", "POST", { title, collection: selected });
        router.push(`/projects/${project.id}`);
      }
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  async function openInbox() {
    try { const project = await libraryRequest<Project>("projects/inbox", "POST"); router.push(`/projects/${project.id}`); }
    catch (reason) { setError(errorMessage(reason)); }
  }

  const visible = (search.trim() ? searchResults ?? [] : projects).filter((p) => selected === null || p.collection === selected);
  const selectedCollection = collections.find((c) => c.id === selected);

  return <div className="library-layout">
    <aside className="library-sidebar">
      <button className={`nav-button ${selected === null ? "active" : ""}`} onClick={() => setSelected(null)}>Todos os projetos <span>{projects.length}</span></button>
      <button className="nav-button" onClick={openInbox}>Caixa de entrada <span>↗</span></button>
      <div className="sidebar-heading"><span>Coleções</span><button className="icon-button" aria-label="Criar coleção" onClick={() => setCreating("collection")}>+</button></div>
      {collections.map((c) => <button key={c.id} className={`nav-button ${selected === c.id ? "active" : ""}`} onClick={() => setSelected(c.id)}>{c.title}<span>{projects.filter((p) => p.collection === c.id).length}</span></button>)}
    </aside>
    <section className="library-main">
      <div className="page-heading"><div><span className="eyebrow">Biblioteca</span><h1>{selectedCollection?.title ?? "Seus projetos"}</h1></div><button onClick={() => setCreating("project")}>+ Projeto</button></div>
      <input aria-label="Buscar projetos e textos" placeholder="Buscar projetos e textos…" type="search" value={search} onChange={(e) => { setSearch(e.target.value); setSearchResults(null); }} className="library-search" />
      {error && <p role="alert">{error}</p>}
      {loading ? <p>Carregando biblioteca…</p> : visible.length ? <div className="project-grid">
        {visible.map((project) => <Link className="project-card" href={`/projects/${project.id}`} key={project.id}>
          <span className="project-mark" aria-hidden="true">¶</span><h2>{project.title}</h2>{project.subtitle && <p>{project.subtitle}</p>}
          <div className="project-card-footer"><span>{project.text_count} {project.text_count === 1 ? "texto" : "textos"}</span><span>{collections.find((c) => c.id === project.collection)?.title ?? ""}</span></div>
        </Link>)}
      </div> : <div className="empty-state"><span className="empty-mark" aria-hidden="true">¶</span><h2>{search ? "Nenhum projeto encontrado" : "Seu próximo texto começa aqui"}</h2>
        {!search && <><p>Crie um projeto ou guarde uma ideia na Caixa de entrada.</p><button onClick={() => setCreating("project")}>+ Criar projeto</button></>}
      </div>}
    </section>
    {creating && <div className="modal-backdrop"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="create-heading">
      <h2 id="create-heading">{creating === "project" ? "Novo projeto" : "Nova coleção"}</h2>
      <form onSubmit={create} className="form-stack"><label htmlFor="new-title">Título</label><input id="new-title" name="title" autoFocus required={creating === "collection"} placeholder={creating === "project" ? "Sem título" : "Nome da coleção"} />
        <div className="button-row"><button type="button" className="secondary" onClick={() => setCreating(null)}>Cancelar</button><button disabled={pending}>{pending ? "Criando…" : "Criar"}</button></div>
      </form>
    </section></div>}
  </div>;
}
