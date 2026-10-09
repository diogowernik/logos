"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/api/client";
import { libraryRequest, errorMessage } from "./api";
import type { EpubImportJob, EpubSource, ExtractionPreview, ExtractionResult } from "./import-types";

export function useEpubImport({ projectId, jobs, onJob, onExtracted, onBusy }: {
  projectId: number;
  jobs: EpubImportJob[];
  onJob: (job: EpubImportJob) => void;
  onExtracted: () => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const job = jobs.find((item) => item.id === selectedId) ?? jobs[0] ?? null;
  const [pending, setPending] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const [cleanOpen, setCleanOpen] = useState(false);
  const [sections, setSections] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<ExtractionPreview | null>(null);
  const [source, setSource] = useState<EpubSource>("original");
  const [stale, setStale] = useState(false);
  const mounted = useRef(false);
  const running = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    onBusy(Boolean(pending));
    return () => onBusy(false);
  }, [pending, onBusy]);

  async function run(label: string, action: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setPending(label);
    setError(null);
    setNotice("");
    try { await action(); }
    catch (reason) {
      if (!mounted.current) return;
      setError(reason);
      if (reason instanceof ApiError && reason.status === 409) setStale(true);
    } finally {
      running.current = false;
      if (mounted.current) setPending("");
    }
  }
  function select(id: string) {
    setSelectedId(id);
    setError(null);
    setNotice("");
    setPreview(null);
  }
  async function upload(file: File) {
    if (!file.name.toLowerCase().endsWith(".epub") || file.size > 50 * 1024 * 1024) {
      setError(new Error("Escolha um arquivo .epub de até 50 MB."));
      return;
    }
    await run("Enviando EPUB…", async () => {
      const form = new FormData();
      form.append("file", file);
      const result = await libraryRequest<EpubImportJob>(`projects/${projectId}/imports`, "POST", form);
      if (!mounted.current) return;
      onJob(result);
      setSelectedId(result.id);
      setNotice("EPUB disponível. O original foi preservado.");
    });
  }
  function reviewClean() {
    if (!job) return;
    setSections(job.inspection.sections.filter((s) => s.selected).map((s) => s.href));
    setError(null);
    setCleanOpen(true);
  }
  async function clean() {
    if (!job) return;
    await run("Limpando EPUB…", async () => {
      try {
        const result = await libraryRequest<EpubImportJob>(`epub-imports/${job.id}/clean`, "POST", { sections });
        if (!mounted.current) return;
        onJob(result);
        setCleanOpen(false);
        setPreview(null);
        setNotice("Cópia limpa gerada. O original foi mantido.");
      } catch (reason) {
        // Retrieve persisted failure/status without hiding the original response.
        try {
          const updated = await libraryRequest<EpubImportJob>(`epub-imports/${job.id}`);
          if (mounted.current) onJob(updated);
        } catch { /* The response still carries a copyable diagnostic. */ }
        throw reason;
      }
    });
  }
  async function loadPreview(nextSource: EpubSource) {
    if (!job || running.current) return;
    setPreviewOpen(true);
    setSource(nextSource);
    setPreview(null);
    setStale(false);
    await run("Preparando prévia…", async () => {
      const result = await libraryRequest<ExtractionPreview>(`epub-imports/${job.id}/preview?project=${projectId}&source=${nextSource}`);
      if (mounted.current) setPreview(result);
    });
  }
  async function extract(mode: "append" | "replace", confirmed: boolean) {
    if (!job || !preview || stale) return;
    await run("Extraindo textos…", async () => {
      const result = await libraryRequest<ExtractionResult>(`epub-imports/${job.id}/extract`, "POST", {
        project: preview.project, source,
        source_sha256: preview.source_sha256, project_state: preview.project_state,
        mode, confirm_existing: confirmed,
      });
      if (!mounted.current) return;
      setPreviewOpen(false);
      setNotice(result.reused ? "Esta extração já foi concluída; nenhum texto foi duplicado." : `${result.text_ids.length} textos extraídos para este projeto.`);
      try { await onExtracted(); }
      catch (reason) {
        if (mounted.current) setError(new Error(`Os textos foram extraídos, mas a atualização da tela falhou. Recarregue o projeto. ${errorMessage(reason)}`));
      }
    });
  }
  async function refreshJob() {
    if (!job) return;
    await run("Atualizando…", async () => {
      const updated = await libraryRequest<EpubImportJob>(`epub-imports/${job.id}`);
      if (mounted.current) onJob(updated);
    });
  }
  return { job, selectedId: job?.id ?? "", select, pending, error, notice, upload,
    cleanOpen, setCleanOpen, sections, setSections, reviewClean, clean,
    previewOpen, setPreviewOpen, preview, source, stale, loadPreview, extract, refreshJob };
}
