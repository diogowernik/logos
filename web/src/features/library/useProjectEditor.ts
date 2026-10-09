"use client";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from "react";
import { libraryRequest, errorMessage } from "./api";
import { useLibrary } from "./LibraryShell";
import type { Project, ProjectContent, Text, EpubArtifact } from "./types";
import type { EpubImportJob } from "./import-types";
export type ProjectEditorOptions = {
  projectId: string;
  initialView?: "overview" | "text" | "new" | "book";
  initialTextId?: number;
};
export function useProjectEditor({
  projectId,
  initialView = "overview",
  initialTextId,
}: ProjectEditorOptions) {
  const router = useRouter();
  const {
    projects,
    collections,
    refresh: refreshLibrary,
    publish,
    setActive,
    guardRef,
  } = useLibrary();
  const [data, setData] = useState<ProjectContent | null>(null);
  const [selected, setSelected] = useState<Text | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [view, setView] = useState<"overview" | "text" | "book">(
    initialView === "overview" || initialView === "book" ? initialView : "text",
  );
  const [book, setBook] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [importPending, setImportPending] = useState(false);
  const [properties, setProperties] = useState(false);
  const [moving, setMoving] = useState(false);
  const drag = useRef<number | null>(null);
  const order = useRef<number[]>([]);
  const dirty = selected
    ? title !== selected.title || body !== selected.markdown
    : Boolean(title || body);

  function choose(text: Text | null) {
    setSelected(text);
    setTitle(text?.title ?? "");
    setBody(text?.markdown ?? "");
    setNotice("");
  }
  function canLeave() {
    return (
      !pending && !importPending &&
      (!dirty ||
        window.confirm("Há alterações não salvas. Descartar essas alterações?"))
    );
  }

  useEffect(() => {
    if (data) publish(data);
  }, [data, publish]);
  useEffect(() => {
    setActive({
      project: Number(projectId),
      text: view === "text" ? (selected?.id ?? null) : null,
    });
    return () => setActive(null);
  }, [projectId, selected?.id, view, setActive]);
  useEffect(() => {
    guardRef.current = canLeave;
    return () => {
      guardRef.current = null;
    };
  });

  useEffect(() => {
    let active = true;
    libraryRequest<ProjectContent>(`projects/${projectId}/content`)
      .then((content) => {
        if (!active) return;
        setData(content);
        const first =
          content.texts.find((text) => text.id === initialTextId) ?? null;
        setSelected(first);
        setTitle(first?.title ?? "");
        setBody(first?.markdown ?? "");
        if (initialTextId && !first) {
          setError("Texto não encontrado neste projeto.");
          setView("overview");
        }
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      });
    if (initialTextId) {
      void libraryRequest(`texts/${initialTextId}/open`, "POST")
        .then(refreshLibrary)
        .catch(() => {});
    }
    if (initialView === "book") {
      void libraryRequest<{ markdown: string }>(
        `projects/${projectId}/markdown`,
      )
        .then((result) => {
          if (active) setBook(result.markdown);
        })
        .catch((reason) => {
          if (active) setError(errorMessage(reason));
        });
    }
    return () => {
      active = false;
    };
  }, [projectId, initialTextId, initialView, refreshLibrary]);

  useEffect(() => {
    function reload() {
      void libraryRequest<ProjectContent>(`projects/${projectId}/content`)
        .then(setData)
        .catch((reason) => setError(errorMessage(reason)));
    }
    window.addEventListener("logos:library-change", reload);
    return () => window.removeEventListener("logos:library-change", reload);
  }, [projectId]);

  useEffect(() => {
    if (!dirty && !importPending) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    function guardLink(event: MouseEvent) {
      const link = (event.target as HTMLElement).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        link &&
        new URL(link.href).pathname !== window.location.pathname &&
        (importPending || !window.confirm("Há alterações não salvas. Descartar essas alterações?"))
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guardLink, true);
    };
  }, [dirty, importPending]);

  async function refresh(id: number | null) {
    const content = await libraryRequest<ProjectContent>(
      `projects/${projectId}/content`,
    );
    setData(content);
    choose(content.texts.find((text) => text.id === id) ?? null);
  }

  async function save() {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const saved = await libraryRequest<Text>(
        selected ? `texts/${selected.id}` : "texts",
        selected ? "PATCH" : "POST",
        {
          title,
          markdown: body,
          ...(!selected ? { project: Number(projectId) } : {}),
        },
      );
      // Mark the saved draft immediately; retain it even if a list refresh fails.
      setSelected(saved);
      const content = await libraryRequest<ProjectContent>(
        `projects/${projectId}/content`,
      );
      setData(content);
      setNotice("Salvo");
      await refreshLibrary();
      if (!selected) router.replace(`/texts/${saved.id}`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Markdown copiado");
    } catch {
      setError(
        "Não foi possível copiar. Selecione o Markdown e copie manualmente.",
      );
    }
  }

  async function textAction(action: "duplicate" | "delete" | "promote") {
    if (!selected || !canLeave()) return;
    if (
      action === "delete" &&
      !window.confirm("Excluir este texto e suas variações?")
    )
      return;
    setPending(true);
    setError("");
    try {
      if (action === "delete") {
        await libraryRequest(`texts/${selected.id}`, "DELETE");
        await refresh(null);
        router.push(data?.project.is_inbox ? "/" : `/projects/${projectId}`);
      } else {
        const result = await libraryRequest<Text>(
          `texts/${selected.id}${action === "duplicate" ? "/duplicate" : ""}`,
          action === "promote" ? "PATCH" : "POST",
          action === "promote" ? { parent: null } : undefined,
        );
        await refresh(result.id);
        router.push(`/texts/${result.id}`);
      }
      await refreshLibrary();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  async function projectAction(action: "duplicate" | "new-version" | "delete") {
    if (!data || !canLeave()) return;
    if (
      action === "new-version" &&
      !window.confirm(
        "Criar uma nova versão principal vazia? O conteúdo atual ficará na versão anterior.",
      )
    )
      return;
    if (
      action === "delete" &&
      !window.confirm(
        data.project.is_principal
          ? "Excluir o projeto, todas as versões, textos e arquivos?"
          : "Excluir esta versão e seus textos? A versão principal será preservada.",
      )
    )
      return;
    setPending(true);
    setError("");
    try {
      if (action === "delete") {
        await libraryRequest(`projects/${projectId}`, "DELETE");
        await refreshLibrary();
        router.push("/");
      } else {
        const project = await libraryRequest<Project>(
          `projects/${projectId}/${action}`,
          "POST",
        );
        await refreshLibrary();
        router.push(`/projects/${project.id}`);
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  async function saveProperties(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const project = await libraryRequest<Project>(
        `projects/${projectId}`,
        "PATCH",
        {
          title: form.get("title"),
          subtitle: form.get("subtitle"),
          author: form.get("author"),
          ...(!data?.project.is_inbox
            ? {
                collection: form.get("collection")
                  ? Number(form.get("collection"))
                  : null,
              }
            : {}),
        },
      );
      setData((current) => current && { ...current, project });
      setProperties(false);
      await refreshLibrary();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  async function move(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canLeave()) return;
    const destination = String(
      new FormData(event.currentTarget).get("project"),
    );
    setPending(true);
    setError("");
    try {
      const target =
        destination === "loose"
          ? (await libraryRequest<Project>("projects/inbox", "POST")).id
          : Number(destination);
      await libraryRequest(`texts/${selected.id}/move`, "POST", {
        project: target,
      });
      await refreshLibrary();
      setMoving(false);
      window.dispatchEvent(new Event("logos:library-change"));
      router.push(`/texts/${selected.id}`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  function beginDrag(event: PointerEvent<HTMLButtonElement>, id: number) {
    if (pending) return;
    drag.current = id;
    order.current = (
      data?.texts.filter((text) => text.parent === null) ?? []
    ).map((text) => text.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function dragOver(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current === null) return;
    const row = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-text-id]");
    const target = Number(row?.dataset.textId);
    if (!target || target === drag.current) return;
    const ids = [...order.current];
    const from = ids.indexOf(drag.current);
    const to = ids.indexOf(target);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, drag.current);
    order.current = ids;
    setData(
      (current) =>
        current && {
          ...current,
          texts: current.texts
            .map((text) =>
              text.parent === null
                ? { ...text, position: ids.indexOf(text.id) }
                : text,
            )
            .sort((a, b) => a.position - b.position),
        },
    );
  }
  async function finishDrag() {
    if (drag.current === null) return;
    drag.current = null;
    setError("");
    try {
      await libraryRequest(`projects/${projectId}/reorder`, "POST", {
        ids: order.current,
      });
    } catch (reason) {
      setError(errorMessage(reason));
      try {
        setData(
          await libraryRequest<ProjectContent>(`projects/${projectId}/content`),
        );
      } catch {
        /* Keep editor draft. */
      }
    }
  }
  async function keyboardOrder(id: number, direction: number) {
    const ids = (data?.texts.filter((text) => text.parent === null) ?? []).map(
      (text) => text.id,
    );
    const from = ids.indexOf(id),
      to = from + direction;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    try {
      await libraryRequest(`projects/${projectId}/reorder`, "POST", { ids });
      setData(
        (current) =>
          current && {
            ...current,
            texts: current.texts
              .map((text) =>
                text.parent === null
                  ? { ...text, position: ids.indexOf(text.id) }
                  : text,
              )
              .sort((a, b) => a.position - b.position),
          },
      );
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  async function copyTexts() {
    try {
      await copy(
        (
          await libraryRequest<{ markdown: string }>(
            `projects/${projectId}/markdown`,
          )
        ).markdown,
      );
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  function updateCover(updated: Project) {
    setData((current) => current && { ...current, project: updated });
    void libraryRequest<ProjectContent>(`projects/${projectId}/content`)
      .then(setData)
      .catch((reason) => setError(errorMessage(reason)));
    void refreshLibrary();
  }

  async function restoreProject() {
    if (!canLeave() || !window.confirm("Restaurar esta versão como principal?"))
      return;
    setPending(true);
    setError("");
    try {
      await libraryRequest(`projects/${projectId}/restore`, "POST");
      await refresh(selected?.id ?? null);
      await refreshLibrary();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }
  function updateEpub(epub: EpubArtifact | null) {
    setData((current) => current && { ...current, epub });
  }
  function updateImport(job: EpubImportJob) {
    setData((current) => current && { ...current, imports: [job, ...(current.imports ?? []).filter((item) => item.id !== job.id)] });
  }
  async function refreshAfterImport() {
    await refresh(null);
    await refreshLibrary();
  }
  return {
    data,
    selected,
    title,
    setTitle,
    body,
    setBody,
    view,
    book,
    error,
    notice,
    pending: pending || importPending,
    properties,
    setProperties,
    moving,
    setMoving,
    dirty,
    projects,
    collections,
    copyTexts,
    updateCover,
    save,
    copy,
    textAction,
    projectAction,
    saveProperties,
    move,
    beginDrag,
    dragOver,
    finishDrag,
    keyboardOrder,
    restoreProject,
    updateEpub,
    updateImport,
    refreshAfterImport,
    setImportPending,
  };
}
