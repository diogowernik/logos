"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { Markdown } from "@/components/Markdown";
import { libraryRequest, errorMessage } from "./api";
import type { Collection, Project, ProjectContent, Text } from "./types";

export function ProjectEditor({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ProjectContent | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selected, setSelected] = useState<Text | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [properties, setProperties] = useState(false);
  const [moving, setMoving] = useState(false);
  const drag = useRef<number | null>(null);
  const order = useRef<number[]>([]);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const dirty = selected ? title !== selected.title || body !== selected.markdown : Boolean(title || body);

  function choose(text: Text | null) {
    setSelected(text); setTitle(text?.title ?? ""); setBody(text?.markdown ?? ""); setNotice("");
  }
  function canLeave() { return !pending && (!dirty || window.confirm("Há alterações não salvas. Descartar essas alterações?")); }

  useEffect(() => {
    let active = true;
    Promise.all([libraryRequest<ProjectContent>(`projects/${projectId}/content`), libraryRequest<Project[]>("projects"), libraryRequest<Collection[]>("collections")])
      .then(([content, p, c]) => {
        if (!active) return;
        setData(content); setProjects(p); setCollections(c);
        const first = content.texts.find((text) => text.parent === null) ?? null;
        setSelected(first); setTitle(first?.title ?? ""); setBody(first?.markdown ?? "");
      }).catch((reason) => { if (active) setError(errorMessage(reason)); });
    return () => { active = false; };
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
      if (action === "delete") { await libraryRequest(`texts/${selected.id}`, "DELETE"); await refresh(null); }
      else {
        const result = await libraryRequest<Text>(`texts/${selected.id}${action === "duplicate" ? "/duplicate" : ""}`, action === "promote" ? "PATCH" : "POST", action === "promote" ? { parent: null } : undefined);
        await refresh(result.id);
      }
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  async function projectAction(action: "duplicate" | "new-version" | "delete") {
    if (!data || !canLeave()) return;
    if (action === "new-version" && !window.confirm("Criar uma nova versão principal vazia? O conteúdo atual ficará na versão anterior.")) return;
    if (action === "delete" && !window.confirm(data.project.is_principal ? "Excluir o projeto, todas as versões e todos os textos?" : "Excluir esta versão e seus textos? A versão principal será preservada.")) return;
    setPending(true); setError("");
    try {
      if (action === "delete") { await libraryRequest(`projects/${projectId}`, "DELETE"); router.push("/"); }
      else { const project = await libraryRequest<Project>(`projects/${projectId}/${action}`, "POST"); router.push(`/projects/${project.id}`); }
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
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  async function move(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canLeave()) return;
    const destination = String(new FormData(event.currentTarget).get("project"));
    setPending(true); setError("");
    try {
      const target = destination === "inbox" ? (await libraryRequest<Project>("projects/inbox", "POST")).id : Number(destination);
      await libraryRequest(`texts/${selected.id}/move`, "POST", { project: target }); await refresh(null); setMoving(false);
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

  return <div className="project-workspace">
    <div className="project-heading"><div><Link href="/">← Biblioteca</Link>
      <h1>{project.title}</h1>{project.subtitle && <p>{project.subtitle}</p>}</div>
      <div className="button-row"><button className="secondary" onClick={async () => {
        try { await copy((await libraryRequest<{ markdown: string }>(`projects/${projectId}/markdown`)).markdown); } catch (reason) { setError(errorMessage(reason)); }
      }}>Copiar projeto</button><details className="action-menu"><summary aria-label="Opções do projeto">•••</summary><div>
        <button onClick={() => setProperties(true)}>Editar projeto</button>
        {!project.is_inbox && <><button disabled={pending} onClick={() => projectAction("duplicate")}>Duplicar projeto</button><button disabled={pending} onClick={() => projectAction("new-version")}>Nova versão principal</button><button className="danger" disabled={pending} onClick={() => projectAction("delete")}>Excluir {project.is_principal ? "projeto" : "versão"}</button></>}
      </div></details></div>
    </div>
    {!project.is_principal && <div className="version-banner">Versão secundária <button className="secondary" onClick={async () => {
      if (!canLeave() || !window.confirm("Restaurar esta versão como principal?")) return;
      try { await libraryRequest(`projects/${projectId}/restore`, "POST"); await refresh(selected?.id ?? null); }
      catch (reason) { setError(errorMessage(reason)); }
    }}>Restaurar como principal</button></div>}
    {error && <p role="alert">{error}</p>}
    <div className="editor-layout"><aside className="text-outline"><div className="sidebar-heading"><span>Textos <small>{primary.length}</small></span><button aria-label="Adicionar texto" className="icon-button" disabled={pending} onClick={() => { if (canLeave()) { choose(null); setMode("write"); textarea.current?.focus(); } }}>+</button></div>
      {primary.length === 0 && <p className="outline-empty">Adicione seu primeiro texto.</p>}
      {primary.map((text, index) => <div key={text.id}>
        <div data-text-id={text.id} className={`text-row ${selected?.id === text.id ? "selected" : ""}`}>
          <button aria-label={`Reordenar ${text.title || `texto ${index + 1}`}`} title="Arraste para reordenar; use as setas do teclado quando focado" className="drag-handle" onPointerDown={(event) => beginDrag(event, text.id)} onPointerMove={dragOver} onPointerUp={finishDrag} onPointerCancel={finishDrag} onKeyDown={(event) => { if (["ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); keyboardOrder(text.id, event.key === "ArrowUp" ? -1 : 1); } }}>⠿</button>
          <button className="text-select" disabled={pending} onClick={() => { if (canLeave()) choose(text); }}><span className="text-number">{String(index + 1).padStart(2, "0")}</span><span>{text.title || "Sem título"}</span></button>
        </div>
        {data.texts.some((variation) => variation.parent === text.id) && <details className="variations" open={selected?.parent === text.id || undefined}><summary>Variações</summary>{data.texts.filter((variation) => variation.parent === text.id).map((variation) => <button className={`nav-button ${selected?.id === variation.id ? "active" : ""}`} key={variation.id} onClick={() => { if (canLeave()) choose(variation); }}>{variation.title || "Sem título"}</button>)}</details>}
      </div>)}
      {data.versions.length > 1 && <details className="project-versions"><summary>Versões do projeto</summary>{data.versions.map((version) => <Link className="version-link" key={version.id} href={`/projects/${version.id}`}>
        {version.is_principal ? "● " : "○ "}{version.title}<small>{version.is_principal ? "Principal" : `${version.text_count} textos`}</small>
      </Link>)}</details>}
    </aside>
    <section className="text-editor"><div className="editor-toolbar"><div className="editor-tabs"><button className={mode === "write" ? "active" : ""} onClick={() => setMode("write")}>Escrever</button><button className={mode === "preview" ? "active" : ""} onClick={() => setMode("preview")}>Preview</button></div>
      <div className="button-row"><span className="save-status" role="status">{pending ? "Salvando…" : dirty ? "Alterações não salvas" : notice}</span><button onClick={save} disabled={pending}>Salvar</button></div></div>
      <div className="editor-paper"><input aria-label="Título do texto" className="text-title" placeholder="Título do texto" value={title} onChange={(event) => setTitle(event.target.value)} disabled={pending} />
        {selected?.parent && <span className="variation-label">Variação</span>}
        {mode === "write" ? <textarea ref={textarea} aria-label="Conteúdo Markdown" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Escreva ou cole seu Markdown aqui…" disabled={pending} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "s") { event.preventDefault(); save(); } }} /> : <Markdown content={body || "*Seu texto aparecerá aqui.*"} />}
      </div>
      <div className="editor-footer"><span>{body.trim() ? body.trim().split(/\s+/).length : 0} palavras</span><div className="button-row"><button className="text-action" onClick={() => copy(body)}>Copiar Markdown</button>{selected && <details className="action-menu"><summary aria-label="Opções do texto">•••</summary><div><button disabled={pending} onClick={() => textAction("duplicate")}>Duplicar como variação</button>{selected.parent && <button disabled={pending} onClick={() => textAction("promote")}>Mover para lista principal</button>}<button disabled={pending} onClick={() => setMoving(true)}>Mover para outro projeto</button><button className="danger" disabled={pending} onClick={() => textAction("delete")}>Excluir texto</button></div></details>}</div></div>
    </section></div>
    {properties && <div className="modal-backdrop"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="properties-heading"><h2 id="properties-heading">Editar projeto</h2><form className="form-stack" onSubmit={saveProperties}>
      <label htmlFor="project-title">Título</label><input id="project-title" name="title" defaultValue={project.title} />
      <label htmlFor="project-subtitle">Subtítulo</label><input id="project-subtitle" name="subtitle" defaultValue={project.subtitle} />
      {!project.is_inbox && <><label htmlFor="collection">Coleção</label><select id="collection" name="collection" defaultValue={project.collection ?? ""}><option value="">Sem coleção</option>{collections.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></>}
      <label htmlFor="project-author">Autor (opcional)</label><input id="project-author" name="author" defaultValue={project.author} />
      <div className="button-row"><button type="button" className="secondary" onClick={() => setProperties(false)}>Cancelar</button><button disabled={pending}>Salvar</button></div>
    </form></section></div>}
    {moving && <div className="modal-backdrop"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="move-heading"><h2 id="move-heading">Mover texto</h2><form className="form-stack" onSubmit={move}>
      <label htmlFor="move-project">Projeto de destino</label><select id="move-project" name="project" required><option value="">Escolha um projeto</option>{!project.is_inbox && <option value="inbox">Caixa de entrada</option>}{projects.filter((p) => p.id !== project.id).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
      <div className="button-row"><button type="button" className="secondary" onClick={() => setMoving(false)}>Cancelar</button><button disabled={pending}>Mover</button></div>
    </form></section></div>}
  </div>;
}
