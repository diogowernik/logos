"use client";
import { useRef, useState } from "react";
import { ApiError } from "@/api/client";
import { useSourceFolder } from "./useSourceFolder";
import { errorMessage, libraryRequest } from "./api";
import type { ExtractionPreview } from "./import-types";
import type { ReadingDocument } from "./ProjectReading";
export function useMarkdownSources({ projectId, groupId, blocked, onBusy, onExtracted, onRead }: {
    projectId: number;
    groupId: number;
    blocked: boolean;
    onBusy: (busy: boolean) => void;
    onExtracted: (groupId?: number) => Promise<void>;
    onRead: (document: ReadingDocument) => void;
}) {
    const folder = useSourceFolder(projectId, "markdown", onBusy, groupId);
    const [target, setTarget] = useState(String(groupId));
    const [newName, setNewName] = useState("");
    const operationId = useRef("");
    const [selected, setSelected] = useState<string[]>([]);
    const [preview, setPreview] = useState<ExtractionPreview | null>(null);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewNames, setReviewNames] = useState<string[]>([]);
    const [stale, setStale] = useState(false);
    const disabled = blocked || Boolean(folder.pending);
    const files = folder.files;
    const checked = selected.filter((name) => files.some((file) => file.name === name));
    async function upload(incoming: File[]) {
        if (disabled || !incoming.length)
            return;
        if (incoming.length > 100 || incoming.some((file) => !file.name.toLowerCase().endsWith(".md") || file.size > 2 * 1024 * 1024) || incoming.reduce((n, f) => n + f.size, 0) > 16 * 1024 * 1024) {
            folder.setError(new Error("Envie até 100 arquivos .md de até 2 MB cada; lote de até 16 MB."));
            return;
        }
        await folder.run("Enviando Markdown…", async () => {
            const form = new FormData();
            incoming.forEach((file) => form.append("files", file));
            await libraryRequest(`projects/${projectId}/markdown-files`, "POST", form);
            if (!folder.mounted.current)
                return;
            folder.notify("Arquivos enviados.");
            await folder.refresh();
        });
    }
    async function loadPreview(names: string[], readOnly = false, nextTarget = target) {
        if (!names.length || folder.pending)
            return;
        if (!readOnly) {
            if (!reviewOpen) operationId.current = crypto.randomUUID();
            setTarget(nextTarget);
            setReviewNames(names);
            setReviewOpen(true);
            setPreview(null);
            setStale(false);
        }
        await folder.run("Preparando prévia…", async () => {
            const result = await libraryRequest<ExtractionPreview>(`projects/${projectId}/markdown-preview`, "POST", { files: names, ...(nextTarget === "new" ? {} : {group: Number(nextTarget)}) });
            if (!folder.mounted.current)
                return;
            if (readOnly)
                onRead({ name: names[0], markdown: result.sections[0].markdown });
            else
                setPreview(result);
        });
    }
    async function generate(mode: "append" | "replace", confirmed: boolean) {
        if (!preview || stale)
            return;
        await folder.run("Gerando textos…", async () => {
            try {
                const result = await libraryRequest<{
                    group: number;
                    text_ids: number[];
                    reused: boolean;
                }>(`projects/${projectId}/markdown-import`, "POST", {
                    files: preview.sections.map((item) => item.href), source_sha256: preview.source_sha256,
                    group_state: preview.group_state,
                    ...(target === "new" ? {new_group_name: newName, operation_id: operationId.current} : {group: Number(target)}), mode, confirm_existing: confirmed,
                });
                if (!folder.mounted.current)
                    return;
                setReviewOpen(false);
                folder.notify(result.reused ? "Este lote já foi importado; nenhum texto foi duplicado." : "Textos disponíveis no projeto.");
                try {
                    await onExtracted(result.group);
                    await folder.refresh();
                }
                catch (reason) {
                    folder.setError(new Error(`Os textos foram gerados, mas a atualização da tela falhou. Recarregue o projeto. ${errorMessage(reason)}`));
                }
            }
            catch (reason) {
                if (folder.mounted.current && reason instanceof ApiError && reason.status === 409)
                    setStale(true);
                throw reason;
            }
        });
    }
    return { target, newName, setNewName, setTarget, folder, files, checked, disabled, setSelected, preview, reviewOpen, setReviewOpen,
        stale, upload, loadPreview, generate, reviewNames };
}
