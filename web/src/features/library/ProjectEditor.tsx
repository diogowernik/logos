"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Markdown } from "@/components/Markdown";
import { CopyIcon, SaveIcon, SidebarIcon } from "@/components/icons/NavigationIcons";
import { libraryRequest, errorMessage } from "./api";
import { useLibrary } from "./LibraryShell";
import type { Project, ProjectContent, Text } from "./types";

export function ProjectEditor({ projectId, initialView = "overview", initialTextId }: {
  projectId: string; initialView?: "overview" | "text" | "new" | "book"; initialTextId?: number;
}) {
  const router = useRouter();
  const { projects, collections, refresh: refreshLibrary, publish, setActive, guardRef, previewOpen, setPreviewOpen, previewHost, setPreviewAvailable } = useLibrary();
  const [data, setData] = useState<ProjectContent | null>(null);
  const [selected, setSelected] = useState<Text | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [view, setView] = useState<"overview" | "text" | "book">(initialView === "overview" || initialView === "book" ? initialView : "text");
  const [book, setBook] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [properties, setProperties] = useState(false);
  const [moving, setMoving] = useState(false);
  const drag = useRef<number | null>(null);
  const order = useRef<number[]>([]);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const dirty = selected ? title !== selected.title || body !== selected.markdown : Boolean(title || body);
  const canPreview = Boolean(data) && view === "text";

  useEffect(() => { setPreviewAvailable(canPreview); }, [canPreview, setPreviewAvailable]);
  useEffect(() => () => setPreviewAvailable(false), [setPreviewAvailable]);

  function choose(text: Text | null) {
    setSelected(text); setTitle(text?.title ?? ""); setBody(text?.markdown ?? ""); setNotice("");
  }
  function canLeave() { return !pending && (!dirty || window.confirm("Há alterações não salvas. Descartar essas alterações?")); }

  useEffect(() => {
    if (data) publish(data);
  }, [data, publish]);
  useEffect(() => {
    setActive({ project: Number(projectId), text: view === "text" ? selected?.id ?? null : null });
    return () => setActive(null);
  }, [projectId, selected?.id, view, setActive]);
  useEffect(() => {
    guardRef.current = canLeave;
    return () => { guardRef.current = null; };
  });

  useEffect(() => {
    let active = true;
    libraryRequest<ProjectContent>(`projects/${projectId}/content`)
      .then((content) => {
        if (!active) return;
        setData(content);
        const first = content.texts.find((text) => text.id === initialTextId) ?? null;
        setSelected(first); setTitle(first?.title ?? ""); setBody(first?.markdown ?? "");
        if (initialTextId && !first) { setError("Texto não encontrado neste projeto."); setView("overview"); }
      }).catch((reason) => { if (active) setError(errorMessage(reason)); });
    if (initialTextId) {
      void libraryRequest(`texts/${initialTextId}/open`, "POST").then(refreshLibrary).catch(() => {});
    }
    if (initialView === "book") {
      void libraryRequest<{ markdown: string }>(`projects/${projectId}/markdown`).then((result) => { if (active) setBook(result.markdown); }).catch((reason) => { if (active) setError(errorMessage(reason)); });
    }
    return () => { active = false; };
  }, [projectId, initialTextId, initialView, refreshLibrary]);

  useEffect(() => {
    function reload() {
      void libraryRequest<ProjectContent>(`projects/${projectId}/content`).then(setData).catch((reason) => setError(errorMessage(reason)));
    }
    window.addEventListener("logos:library-change", reload);
    return () => window.removeEventListener("logos:library-change", reload);
  }, [projectId]);

  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    function guardLink(event: MouseEvent) {
      const link = (event.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (link && new URL(link.href).pathname !== window.location.pathname &&
          !window.confirm("Há alterações não salvas. Descartar essas alterações?")) {
        event.preventDefault(); event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", guardLink, true); };
  }, [dirty]);

  async function refresh(id: number | null) {
    const content = await libraryRequest<ProjectContent>(`projects/${projectId}/content`);
    setData(content); choose(content.texts.find((text) => text.id === id) ?? null);
  }

  async function save() {
    setPending(true); setError(""); setNotice("");
    try {
      const saved = await libraryRequest<Text>(selected ? `texts/${selected.id}` : "texts", selected ? "PATCH" : "POST", {
        title, markdown: body, ...(!selected ? { project: Number(projectId) } : {}),
      });
      // Mark the saved draft immediately; retain it even if a list refresh fails.
      setSelected(saved);
      const content = await libraryRequest<ProjectContent>(`projects/${projectId}/content`);
      setData(content); setNotice("Salvo");
      await refreshLibrary();
      if (!selected) router.replace(`/texts/${saved.id}`);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice("Markdown copiado"); }
    catch { setError("Não foi possível copiar. Selecione o Markdown e copie manualmente."); }
  }

  async function textAction(action: "duplicate" | "delete" | "promote") {
    if (!selected || !canLeave()) return;
    if (action === "delete" && !window.confirm("Excluir este texto e suas variações?")) return;
    setPending(true); setError("");
    try {
      if (action === "delete") { await libraryRequest(`texts/${selected.id}`, "DELETE"); await refresh(null); router.push(data?.project.is_inbox ? "/" : `/projects/${projectId}`); }
      else {
        const result = await libraryRequest<Text>(`texts/${selected.id}${action === "duplicate" ? "/duplicate" : ""}`, action === "promote" ? "PATCH" : "POST", action === "promote" ? { parent: null } : undefined);
        await refresh(result.id);
        router.push(`/texts/${result.id}`);
      }
      await refreshLibrary();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  async function projectAction(action: "duplicate" | "new-version" | "delete") {
    if (!data || !canLeave()) return;
    if (action === "new-version" && !window.confirm("Criar uma nova versão principal vazia? O conteúdo atual ficará na versão anterior.")) return;
    if (action === "delete" && !window.confirm(data.project.is_principal ? "Excluir o projeto, todas as versões e todos os textos?" : "Excluir esta versão e seus textos? A versão principal será preservada.")) return;
    setPending(true); setError("");
    try {
      if (action === "delete") { await libraryRequest(`projects/${projectId}`, "DELETE"); await refreshLibrary(); router.push("/"); }
      else { const project = await libraryRequest<Project>(`projects/${projectId}/${action}`, "POST"); await refreshLibrary(); router.push(`/projects/${project.id}`); }
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  async function saveProperties(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true); setError("");
    try {
      const project = await libraryRequest<Project>(`projects/${projectId}`, "PATCH", {
        title: form.get("title"), subtitle: form.get("subtitle"), author: form.get("author"),
        ...(!data?.project.is_inbox ? { collection: form.get("collection") ? Number(form.get("collection")) : null } : {}),
      });
      setData((current) => current && { ...current, project }); setProperties(false);
      await refreshLibrary();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  async function move(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canLeave()) return;
    const destination = String(new FormData(event.currentTarget).get("project"));
    setPending(true); setError("");
    try {
      const target = destination === "loose" ? (await libraryRequest<Project>("projects/inbox", "POST")).id : Number(destination);
      await libraryRequest(`texts/${selected.id}/move`, "POST", { project: target });
      await refreshLibrary(); setMoving(false);
      window.dispatchEvent(new Event("logos:library-change"));
      router.push(`/texts/${selected.id}`);
    }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  function beginDrag(event: PointerEvent<HTMLButtonElement>, id: number) {
    if (pending) return;
    drag.current = id; order.current = (data?.texts.filter((text) => text.parent === null) ?? []).map((text) => text.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function dragOver(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current === null) return;
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-text-id]");
    const target = Number(row?.dataset.textId);
    if (!target || target === drag.current) return;
    const ids = [...order.current]; const from = ids.indexOf(drag.current); const to = ids.indexOf(target);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1); ids.splice(to, 0, drag.current); order.current = ids;
    setData((current) => current && { ...current, texts: current.texts.map((text) => text.parent === null ? { ...text, position: ids.indexOf(text.id) } : text).sort((a, b) => a.position - b.position) });
  }
  async function finishDrag() {
    if (drag.current === null) return;
    drag.current = null; setError("");
    try { await libraryRequest(`projects/${projectId}/reorder`, "POST", { ids: order.current }); }
    catch (reason) {
      setError(errorMessage(reason));
      try { setData(await libraryRequest<ProjectContent>(`projects/${projectId}/content`)); } catch { /* Keep editor draft. */ }
    }
  }
  async function keyboardOrder(id: number, direction: number) {
    const ids = (data?.texts.filter((text) => text.parent === null) ?? []).map((text) => text.id);
    const from = ids.indexOf(id), to = from + direction;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    try {
      await libraryRequest(`projects/${projectId}/reorder`, "POST", { ids });
      setData((current) => current && { ...current, texts: current.texts.map((text) => text.parent === null ? { ...text, position: ids.indexOf(text.id) } : text).sort((a, b) => a.position - b.position) });
    } catch (reason) { setError(errorMessage(reason)); }
  }

  if (!data) return <section><p>{error || "Carregando projeto…"}</p><Link href="/">Voltar à biblioteca</Link></section>;
  const project = data.project;
  const primary = data.texts.filter((text) => text.parent === null);

  const collection = collections.find((item) => item.id === project.collection);

  function readBook() {
    if (!canLeave()) return;
    router.push(`/projects/${projectId}/read`);
  }

  async function copyBook() {
    try { await copy((await libraryRequest<{ markdown: string }>(`projects/${projectId}/markdown`)).markdown); }
    catch (reason) { setError(errorMessage(reason)); }
  }

  return <div className="project-workspace">
    <div className="workspace-path"><nav className="breadcrumbs" aria-label="Caminho">
      <Link href="/">Biblioteca</Link>
      {collection && <><span>/</span><Link href={`/?collection=${collection.id}`}>{collection.title}</Link></>}
      {!project.is_inbox && <><span>/</span><Link href={`/projects/${project.id}`}>{project.title}</Link></>}
      {view === "text" && <><span>/</span><span aria-current="page">{title || "Novo texto"}</span></>}
      {view === "book" && <><span>/</span><span aria-current="page">Leitura</span></>}
    </nav>
    {!project.is_inbox && <details className="action-menu"><summary aria-label="Opções do projeto">•••</summary><div>
      <button onClick={() => setProperties(true)}>Editar projeto</button>
      <button disabled={pending} onClick={() => projectAction("duplicate")}>Duplicar projeto</button>
      <button disabled={pending} onClick={() => projectAction("new-version")}>Nova versão principal</button>
      <button className="danger" disabled={pending} onClick={() => projectAction("delete")}>Excluir {project.is_principal ? "projeto" : "versão"}</button>
    </div></details>}
    </div>
    {!project.is_principal && <div className="version-banner">Versão secundária <button className="secondary" onClick={async () => {
      if (!canLeave() || !window.confirm("Restaurar esta versão como principal?")) return;
      try { await libraryRequest(`projects/${projectId}/restore`, "POST"); await refresh(selected?.id ?? null); await refreshLibrary(); }
      catch (reason) { setError(errorMessage(reason)); }
    }}>Restaurar como principal</button></div>}
    {error && !properties && !moving && <p role="alert">{error}</p>}
    {view === "overview" && <section className="project-overview">
      <div className="overview-heading"><div className="overview-cover" aria-hidden="true">¶</div><div className="overview-description"><span className="eyebrow">Projeto</span><h1>{project.is_inbox ? "Textos soltos" : project.title}</h1>{project.subtitle && <p>{project.subtitle}</p>}{project.author && <p>{project.author}</p>}<p>{primary.length} {primary.length === 1 ? "texto" : "textos"}</p><div className="button-row"><button className="secondary" onClick={readBook} disabled={!primary.length}>Ler livro</button><button className="secondary" onClick={copyBook}>Copiar livro</button><button className="text-action" onClick={() => setProperties(true)}>Editar informações</button></div></div></div>
      <section className="overview-chapters"><div className="overview-section-heading"><h2>Sumário</h2><Link className="button-link" href={`/projects/${project.id}/new`}>+ Adicionar texto</Link></div>
        {primary.length === 0 && <p className="outline-empty">Adicione seu primeiro texto para começar.</p>}
        {primary.map((text, index) => <div data-text-id={text.id} className="overview-chapter" key={text.id}>
          <button aria-label={`Reordenar ${text.title || `texto ${index + 1}`}`} title="Arraste para reordenar; use as setas do teclado quando focado" className="drag-handle" onPointerDown={(event) => beginDrag(event, text.id)} onPointerMove={dragOver} onPointerUp={finishDrag} onPointerCancel={finishDrag} onKeyDown={(event) => { if (["ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); void keyboardOrder(text.id, event.key === "ArrowUp" ? -1 : 1); } }}>⠿</button>
          <span className="text-number">{String(index + 1).padStart(2, "0")}</span><Link href={`/texts/${text.id}`}>{text.title || "Sem título"}</Link><small>{text.markdown.trim() ? text.markdown.trim().split(/\s+/).length : 0} palavras</small>
        </div>)}
      </section>
      {data.versions.length > 1 && <details className="project-versions"><summary>Versões do projeto</summary>{data.versions.map((version) => <Link className="version-link" key={version.id} href={`/projects/${version.id}`}>{version.is_principal ? "● " : "○ "}{version.title}<small>{version.is_principal ? "Principal" : `${version.text_count} textos`}</small></Link>)}</details>}
      {notice && <p role="status">{notice}</p>}
    </section>}
    {view === "book" && <section className="text-editor book-reader"><div className="editor-toolbar"><span>Leitura do livro</span><button className="text-action" disabled={!book} onClick={() => copy(book)}>Copiar livro</button></div><article className="editor-paper">{book ? <Markdown content={book} /> : !error && <p>Carregando leitura…</p>}</article></section>}
    {view === "text" && <section className="text-editor"><div className="editor-toolbar"><div className="editor-heading-controls">
      <input aria-label="Título do texto" className="editor-title" placeholder="Título do texto" value={title} onChange={(event) => setTitle(event.target.value)} disabled={pending} />
      </div>
      <div className="editor-actions"><span className="save-status" role="status">{pending ? "Salvando…" : dirty ? "Alterações não salvas" : notice}</span><button className="quiet-icon-button" aria-label="Copiar Markdown" title="Copiar Markdown" onClick={() => copy(body)}><CopyIcon /></button><button className="quiet-icon-button" aria-label={previewOpen ? "Ocultar preview" : "Mostrar preview"} title={previewOpen ? "Ocultar preview" : "Mostrar preview"} aria-expanded={previewOpen} aria-controls="text-preview" onClick={() => setPreviewOpen(!previewOpen)}><SidebarIcon side="right" /></button><span className="editor-action-divider" aria-hidden="true" /><button className="quiet-icon-button" aria-label="Salvar" title="Salvar" onClick={save} disabled={pending}><SaveIcon /></button></div></div>
      <div className="editor-paper">
          {selected?.parent && <span className="variation-label">Variação</span>}
          <div className="editor-content">
            <textarea ref={textarea} aria-label="Conteúdo Markdown" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Escreva ou cole seu Markdown aqui…" disabled={pending} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "s") { event.preventDefault(); void save(); } }} />
          </div>
      </div>
      <div className="editor-footer"><span>{body.trim() ? body.trim().split(/\s+/).length : 0} palavras</span><div className="button-row">{selected && <details className="action-menu"><summary aria-label="Opções do texto">•••</summary><div><button disabled={pending} onClick={() => textAction("duplicate")}>Duplicar como variação</button>{selected.parent && <button disabled={pending} onClick={() => textAction("promote")}>Mover para lista principal</button>}<button disabled={pending} onClick={() => setMoving(true)}>{project.is_inbox ? "Adicionar ao projeto…" : "Mover para…"}</button><button className="danger" disabled={pending} onClick={() => textAction("delete")}>Excluir texto</button></div></details>}</div></div>
    </section>}
    {canPreview && previewOpen && previewHost && createPortal(<><span className="preview-label">Preview ao vivo</span><Markdown content={body || "*Seu texto aparecerá aqui.*"} /></>, previewHost)}
    {properties && <div className="modal-backdrop"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="properties-heading"><h2 id="properties-heading">Editar projeto</h2><form className="form-stack" onSubmit={saveProperties}>
      {error && <p role="alert">{error}</p>}
      <label htmlFor="project-title">Título</label><input id="project-title" name="title" defaultValue={project.title} />
      <label htmlFor="project-subtitle">Subtítulo</label><input id="project-subtitle" name="subtitle" defaultValue={project.subtitle} />
      {!project.is_inbox && <><label htmlFor="collection">Coleção</label><select id="collection" name="collection" defaultValue={project.collection ?? ""}><option value="">Sem coleção</option>{collections.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></>}
      <label htmlFor="project-author">Autor (opcional)</label><input id="project-author" name="author" defaultValue={project.author} />
      <div className="button-row"><button type="button" className="secondary" onClick={() => setProperties(false)}>Cancelar</button><button disabled={pending}>Salvar</button></div>
    </form></section></div>}
    {moving && <div className="modal-backdrop"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="move-heading"><h2 id="move-heading">{project.is_inbox ? "Adicionar ao projeto" : "Mover texto"}</h2><form className="form-stack" onSubmit={move}>
      {error && <p role="alert">{error}</p>}
      <label htmlFor="move-project">Projeto de destino</label><select id="move-project" name="project" required><option value="">Escolha um projeto</option>{!project.is_inbox && <option value="loose">Deixar como texto solto</option>}{projects.filter((p) => p.id !== project.id).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
      <div className="button-row"><button type="button" className="secondary" onClick={() => setMoving(false)}>Cancelar</button><button disabled={pending}>Mover</button></div>
    </form></section></div>}
  </div>;
}
