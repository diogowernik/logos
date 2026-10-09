"use client";
import Link from "next/link";
import MuiLink from "@mui/material/Link";
import { useMemo, useState, type ReactNode } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { CopyIcon, ComposeIcon, PlusIcon } from "@/components/icons/NavigationIcons";
import { HeaderActions, CompactActionButton } from "@/components/ui/HeaderControls";
import { ChapterRow, ChapterDragHandle, ChapterReadButton, ProjectSummary, BookIdentity, BookTitleActions } from "@/theme/project";
import { useShell } from "@/components/shell/AppShell";
import { CardGrid, CardGridFullWidth } from "@/components/ui/CardLayout";
import { BookSection } from "./BookSection";
import { useBookLayout } from "./useBookLayout";
import { useBookBusy } from "./useBookBusy";
import { ProjectGroups } from "./ProjectGroups";
import { ProjectReading, type ReadingDocument } from "./ProjectReading";
import { ProjectCover } from "./ProjectCover";
import { ProjectFiles } from "./ProjectFiles";
import { ProjectMarkdown } from "./ProjectMarkdown";
import { ProjectExport } from "./ProjectExport";
import { ProjectEpubs } from "./ProjectEpubs";
import type { useProjectEditor } from "./useProjectEditor";

export function ProjectOverview({ editor, actions }: { editor: ReturnType<typeof useProjectEditor>; actions?: ReactNode }) {
    const { data, copy, copyTexts, setProperties, updateCover, updateEpub, beginDrag, dragOver, finishDrag, keyboardOrder, notice, updateImport, refreshAfterImport, setImportPending, pending } = editor;
    const { areas, toggle } = useBookLayout(data!.project.id);
    const { busy, callbacks } = useBookBusy(setImportPending);
    const [reading, setReading] = useState<{ groupId: number; textId: number } | ReadingDocument | null>(null);
    const { setRightOpen } = useShell();
    const [exportActionsHost, setExportActionsHost] = useState<HTMLDivElement | null>(null);
    const document = useMemo(() => {
      if (!reading || !data) return null;
      if ("markdown" in reading) return reading;
      if (reading.groupId !== data.group.id) return null;
      const text = data.texts.find((item) => item.id === reading.textId);
      return text ? { name: text.title || "Sem título", markdown: text.markdown } : null;
    }, [data, reading]);
    if (!data) return null;
    const { project } = data;
    const collection = editor.collections.find((item) => item.id === project.collection);
    const primary = data.texts.filter((text) => text.parent === null);
    const blocked = pending || busy;
    return <Stack component="section" aria-label="Área de trabalho do livro">
      {project.is_inbox && <BookIdentity>
        <Typography component="h1" variant="h6">{project.title}</Typography>
        <BookTitleActions>{actions}</BookTitleActions>
      </BookIdentity>}
      <CardGrid>
      {!project.is_inbox && <BookSection title={project.title} expanded={areas.info} onToggle={() => toggle("info")} actions={<HeaderActions>
        <CompactActionButton label="Editar informações" disabled={blocked} onClick={() => setProperties(true)}><ComposeIcon /></CompactActionButton>
        {actions}
      </HeaderActions>}>
        <BookIdentity>
          <ProjectCover project={project} onChange={updateCover} onBusy={callbacks.cover} blocked={blocked}/>
          <ProjectSummary>
            {collection && <MuiLink component={Link} href={`/?collection=${collection.id}`}>{collection.title}</MuiLink>}
            {project.subtitle && <Typography>{project.subtitle}</Typography>}
            {project.author && <Typography color="text.secondary">{project.author}</Typography>}
            {!project.subtitle && !project.author && <Typography color="text.secondary">Sem subtítulo ou autor.</Typography>}
            {data.epub && <MuiLink href={data.epub.url} download={data.epub.filename} aria-label="Baixar EPUB revisado">{data.epub.filename}</MuiLink>}
          </ProjectSummary>
        </BookIdentity>
      </BookSection>}
      {!project.is_inbox && <ProjectEpubs key={`epub-${data.group.id}`} groupId={data.group.id} groups={data.groups} projectId={project.id} jobs={data.imports ?? []} onJob={updateImport} onExtracted={refreshAfterImport} onBusy={callbacks.epub} onLocalBusy={callbacks.local} onRead={setReading} blocked={blocked} expanded={areas.epubs} onToggle={() => toggle("epubs")}/>}
      <CardGridFullWidth>
        <ProjectGroups editor={editor} blocked={blocked} expanded={areas.texts} onToggle={() => toggle("texts")} actions={<HeaderActions>
          {!project.is_inbox && <div ref={setExportActionsHost}/>}
          <CompactActionButton label="Copiar todos os textos" disabled={blocked || !primary.some((text) => text.markdown.trim())} onClick={copyTexts}><CopyIcon /></CompactActionButton>
          <Tooltip title="Adicionar texto"><span><IconButton component={Link} href={`/projects/${project.id}/new?group=${data.group.id}`} disabled={blocked} aria-label="Adicionar texto"><PlusIcon /></IconButton></span></Tooltip>
        </HeaderActions>}>
          {notice && <Typography variant="body2" color="text.secondary" role="status">{notice}</Typography>}
          {primary.length === 0 && <Typography color="text.secondary">Nenhum texto neste grupo.</Typography>}
          {primary.map((text, index) => <ChapterRow data-text-id={text.id} key={text.id}>
            <ChapterDragHandle disabled={blocked} aria-label={`Reordenar ${text.title || `texto ${index + 1}`}`} title="Arraste para reordenar; use as setas do teclado quando focado" onPointerDown={(event) => beginDrag(event, text.id)} onPointerMove={dragOver} onPointerUp={finishDrag} onPointerCancel={finishDrag} onKeyDown={(event) => {
              if (["ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); void keyboardOrder(text.id, event.key === "ArrowUp" ? -1 : 1); }
            }}>⠿</ChapterDragHandle>
            <ChapterReadButton disabled={blocked} onClick={() => { setReading({groupId: data.group.id, textId: text.id}); setRightOpen(true); }}>{text.title || "Sem título"}</ChapterReadButton>
            <HeaderActions>
              <CompactActionButton label={`Copiar ${text.title || "texto sem título"}`} disabled={blocked} onClick={() => copy(text.compiled_markdown ?? text.markdown)}><CopyIcon /></CompactActionButton>
              <Tooltip title="Editar texto"><span><IconButton component={Link} href={`/texts/${text.id}`} disabled={blocked} aria-label={`Editar ${text.title || "texto sem título"}`}><ComposeIcon /></IconButton></span></Tooltip>
            </HeaderActions>
          </ChapterRow>)}
          {!project.is_inbox && <ProjectExport actionsHost={exportActionsHost} key={data.group.id} groupId={data.group.id} artifact={data.epub ?? null} hasContent={primary.some((text) => text.markdown.trim())} onChange={updateEpub} blocked={blocked} onBusy={callbacks.export}/>}
        </ProjectGroups>
      </CardGridFullWidth>
      {!project.is_inbox && <>
        <ProjectFiles project={project} assets={data.assets ?? []} onChange={updateCover} onBusy={callbacks.files} blocked={blocked} expanded={areas.files} onToggle={() => toggle("files")}/>
        <ProjectMarkdown key={`md-${data.group.id}`} groupId={data.group.id} groups={data.groups} projectId={project.id} onRead={setReading} onBusy={callbacks.markdown} blocked={blocked} onExtracted={refreshAfterImport} expanded={areas.markdown} onToggle={() => toggle("markdown")}/>
      </>}
      </CardGrid>
      <ProjectReading document={document}/>
    </Stack>;
}
