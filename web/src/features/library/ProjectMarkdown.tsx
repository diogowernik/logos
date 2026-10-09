"use client";
import { useRef, useState } from "react";

import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { UploadIcon, RefreshIcon, DownloadIcon, ExtractIcon } from "@/components/icons/NavigationIcons";
import { BookSection } from "./BookSection";
import { HeaderActions, CompactActionButton } from "@/components/ui/HeaderControls";
import { BookSourceDrop, BookSourceRow, ProjectFileInfo, ProjectFileName } from "@/theme/project";
import { ReadingButton } from "@/theme/workspace";
import type { ReadingDocument } from "./ProjectReading";
import { useMarkdownSources } from "./useMarkdownSources";
import { ImportFeedback } from "./ImportFeedback";
import { TextImportDialog } from "./TextImportDialog";
const statusLabels = { new: "", imported: "Textos já gerados", changed: "Fonte alterada após a importação", text_missing: "Texto anterior removido · revise o projeto", unregistered: "", registered: "", missing: "" };
export function ProjectMarkdown({ projectId, groupId, groups, blocked, onBusy, onExtracted, onRead, expanded, onToggle }: {
    expanded?: boolean;
    onToggle?: () => void;
    projectId: number;
    groupId: number;
    groups: import("./types").TextGroup[];
    onRead: (document: ReadingDocument) => void;
    blocked: boolean;
    onBusy: (busy: boolean) => void;
    onExtracted: (groupId?: number) => Promise<void>;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const { target, newName, setNewName, folder, files, checked, disabled, setSelected, preview, reviewOpen, setReviewOpen, stale, upload, loadPreview, generate, reviewNames } = useMarkdownSources({ projectId, groupId, blocked, onBusy, onExtracted, onRead });
    return <BookSection title="Markdown" expanded={expanded} onToggle={onToggle} actions={<HeaderActions>
      <CompactActionButton label="Atualizar pasta" disabled={disabled} onClick={() => folder.run("Atualizando pasta…", folder.refresh)}><RefreshIcon /></CompactActionButton>
      <CompactActionButton label="Enviar Markdown" disabled={disabled} onClick={() => input.current?.click()}><UploadIcon /></CompactActionButton>
    </HeaderActions>}>
    <BookSourceDrop role="group" aria-label="Área de upload Markdown" dragging={dragging} onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!disabled) void upload(Array.from(event.dataTransfer.files)); }}>
    <input ref={input} type="file" multiple accept=".md,text/markdown" hidden aria-label="Arquivos Markdown" disabled={disabled} onChange={(event) => { const incoming = Array.from(event.target.files ?? []); event.target.value = ""; void upload(incoming); }}/>
    {!reviewOpen && <ImportFeedback error={folder.error}/>}
    {folder.notice && <Typography role="status" variant="body2">{folder.notice}</Typography>}
    {folder.pending && !reviewOpen && <Typography role="status" variant="body2">{folder.pending}</Typography>}
    {folder.loading ? <Typography color="text.secondary">Consultando pasta…</Typography> : !files.length && <Typography color="text.secondary">Nenhum Markdown na pasta.</Typography>}
    {files.map((file) => <BookSourceRow key={file.name}>
      <Checkbox disabled={disabled} checked={checked.includes(file.name)} slotProps={{ input: { "aria-label": `Selecionar ${file.name}` } }} onChange={(_, value) => setSelected((current) => value ? [...current, file.name] : current.filter((name) => name !== file.name))}/>
      <ProjectFileInfo><ProjectFileName><ReadingButton disabled={disabled} onClick={() => loadPreview([file.name], true)}>{file.name}</ReadingButton></ProjectFileName>
        <Typography variant="caption" color="text.secondary">{statusLabels[file.status]}</Typography>
      </ProjectFileInfo>
      <HeaderActions>
        <Tooltip title="Baixar Markdown"><IconButton component="a" aria-label={`Baixar ${file.name}`} href={`/api/library/projects/${projectId}/markdown-file?name=${encodeURIComponent(file.name)}`} download={file.name}><DownloadIcon /></IconButton></Tooltip>
        <CompactActionButton label={`Gerar texto de ${file.name}`} disabled={disabled} onClick={() => loadPreview([file.name])}><ExtractIcon /></CompactActionButton>
      </HeaderActions>
    </BookSourceRow>)}
    {files.length > 0 && <HeaderActions>
      <Button disabled={disabled} onClick={() => setSelected(checked.length === files.length ? [] : files.map((file) => file.name))}>{checked.length === files.length ? "Desmarcar todos" : "Selecionar todos"}</Button>
      <Button variant="contained" disabled={disabled} onClick={() => loadPreview(checked.length ? checked : files.map((file) => file.name))}>{checked.length ? "Gerar selecionados" : "Gerar todos"}</Button>
    </HeaderActions>}
    </BookSourceDrop>
    <TextImportDialog destination={{groups, target, name: newName, disabled: Boolean(folder.pending), onName: setNewName, onTarget: (next) => { void loadPreview(reviewNames, false, next); }}} open={reviewOpen} preview={preview} source="markdown" pending={folder.pending} stale={stale} error={folder.error} onClose={() => setReviewOpen(false)} onReload={() => loadPreview(reviewNames)} onExtract={generate}/>
  </BookSection>;
}
