"use client";
import { useRef, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import { HeaderActions } from "@/components/ui/HeaderControls";
import { ProjectFileRow, ProjectFileInfo, ProjectFileName, ProjectPanelToolbar } from "@/theme/project";
import { SourceDropArea } from "@/theme/source-folder";
import { ReadingButton } from "@/theme/workspace";
import type { ReadingDocument } from "./ProjectReading";
import { useMarkdownSources } from "./useMarkdownSources";
import { ImportFeedback } from "./ImportFeedback";
import { TextImportDialog } from "./TextImportDialog";
const statusLabels = { new: "", imported: "Textos já gerados", changed: "Fonte alterada após a importação", text_missing: "Texto anterior removido · revise o projeto", unregistered: "", registered: "", missing: "" };
export function ProjectMarkdown({ projectId, groupId, groups, blocked, onBusy, onExtracted, onRead }: {
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
    return <Stack component="section" spacing={2} aria-label="Fontes Markdown">
    <ProjectPanelToolbar>
      <Typography component="h2" variant="body1">Markdown</Typography>
      <HeaderActions>
        <Button disabled={disabled} onClick={() => folder.run("Atualizando pasta…", folder.refresh)}>Atualizar pasta</Button>
        {checked.length > 0 && <Button disabled={disabled} onClick={() => loadPreview(checked)}>Gerar selecionados</Button>}
        <Button disabled={disabled || !files.length} onClick={() => loadPreview(files.map((file) => file.name))}>Gerar todos</Button>
      </HeaderActions>
    </ProjectPanelToolbar>
    <SourceDropArea dragging={dragging} disabled={disabled} onClick={() => input.current?.click()} onDragOver={(event) => { event.preventDefault(); if (!disabled)
        setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(Array.from(event.dataTransfer.files)); }}>
      Arraste arquivos Markdown ou clique para enviar
    </SourceDropArea>
    <input ref={input} type="file" multiple accept=".md,text/markdown" hidden aria-label="Arquivos Markdown" disabled={disabled} onChange={(event) => { const incoming = Array.from(event.target.files ?? []); event.target.value = ""; void upload(incoming); }}/>
    {!reviewOpen && <ImportFeedback error={folder.error}/>}
    {folder.notice && <Typography role="status" variant="body2">{folder.notice}</Typography>}
    {folder.pending && !reviewOpen && <Typography role="status" variant="body2">{folder.pending}</Typography>}
    {folder.loading ? <Typography color="text.secondary">Consultando pasta…</Typography> : !files.length && <Typography color="text.secondary">Nenhum Markdown na pasta.</Typography>}
    {files.map((file) => <ProjectFileRow key={file.name}>
      <Checkbox disabled={disabled} checked={checked.includes(file.name)} slotProps={{ input: { "aria-label": `Selecionar ${file.name}` } }} onChange={(_, value) => setSelected((current) => value ? [...current, file.name] : current.filter((name) => name !== file.name))}/>
      <ProjectFileInfo><ProjectFileName><ReadingButton disabled={disabled} onClick={() => loadPreview([file.name], true)}>{file.name}</ReadingButton></ProjectFileName>
        <Typography variant="caption" color="text.secondary">{statusLabels[file.status]}</Typography>
      </ProjectFileInfo>
      <HeaderActions>
        <Button component="a" href={`/api/library/projects/${projectId}/markdown-file?name=${encodeURIComponent(file.name)}`} download={file.name}>Baixar</Button>
        <Button aria-label={`Gerar texto de ${file.name}`} disabled={disabled} onClick={() => loadPreview([file.name])}>Gerar texto</Button>
      </HeaderActions>
    </ProjectFileRow>)}
    <TextImportDialog destination={{groups, target, name: newName, disabled: Boolean(folder.pending), onName: setNewName, onTarget: (next) => { void loadPreview(reviewNames, false, next); }}} open={reviewOpen} preview={preview} source="markdown" pending={folder.pending} stale={stale} error={folder.error} onClose={() => setReviewOpen(false)} onReload={() => loadPreview(reviewNames)} onExtract={generate}/>
  </Stack>;
}
