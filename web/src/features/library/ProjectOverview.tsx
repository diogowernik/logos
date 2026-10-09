"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import Tab from "@mui/material/Tab";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { CopyIcon, ComposeIcon } from "@/components/icons/NavigationIcons";
import { HeaderActions, CompactActionButton, } from "@/components/ui/HeaderControls";
import { ChapterRow, ChapterDragHandle, ChapterReadButton, ProjectIdentity, ProjectSummary, ProjectTitleGroup, ProjectTitle, ProjectFeedback, ProjectTabs, ProjectTabPanel, ProjectPanelToolbar, } from "@/theme/project";
import { useShell } from "@/components/shell/AppShell";
import { ProjectGroups } from "./ProjectGroups";
import { ProjectReading, type ReadingDocument } from "./ProjectReading";
import { ProjectCover } from "./ProjectCover";
import { ProjectFiles } from "./ProjectFiles";
import { ProjectMarkdown } from "./ProjectMarkdown";
import { ProjectExport } from "./ProjectExport";
import { ProjectEpubs } from "./ProjectEpubs";
import type { useProjectEditor } from "./useProjectEditor";
export function ProjectOverview({ editor, }: {
    editor: ReturnType<typeof useProjectEditor>;
}) {
    const [section, setSection] = useState("overview");
    const [readingTextId, setReadingTextId] = useState<number | null>(null);
    const [readingMarkdown, setReadingMarkdown] = useState<ReadingDocument | null>(null);
    const { setRightOpen } = useShell();
    const { data, copyTexts, setProperties, updateCover, updateEpub, beginDrag, dragOver, finishDrag, keyboardOrder, notice, updateImport, refreshAfterImport, setImportPending, pending, } = editor;
    const readingText = data?.texts.find((text) => text.id === readingTextId && text.parent === null);
    const activeSection = data?.project.is_inbox ? "chapters" : section;
    const reading = useMemo(() => {
        if (activeSection === "markdown") return readingMarkdown;
        if (activeSection === "chapters" && readingText)
            return { name: readingText.title || "Sem título", markdown: readingText.markdown };
        return null;
    }, [activeSection, readingText, readingMarkdown]);
    if (!data)
        return null;
    const { project } = data;
    const primary = data.texts.filter((text) => text.parent === null);
    return (<Stack component="section" spacing={2}>
      {!project.is_inbox && <ProjectGroups editor={editor} />}
      <Card component="section" aria-label="Área de trabalho do livro">
        <ProjectTabs value={project.is_inbox ? "chapters" : section} onChange={(_, value: string) => setSection(value)} aria-label="Seções do livro" variant="scrollable" scrollButtons="auto">
          {!project.is_inbox && <Tab value="overview" label="Visão geral" id="project-tab-overview" aria-controls="project-panel-overview"/>}
          <Tab value="chapters" label="Textos" id="project-tab-chapters" aria-controls="project-panel-chapters"/>
          {!project.is_inbox && <Tab value="markdown" label="Markdown" id="project-tab-markdown" aria-controls="project-panel-markdown"/>}
          {!project.is_inbox && <Tab value="imports" label="Importação" id="project-tab-imports" aria-controls="project-panel-imports"/>}
          {!project.is_inbox && <Tab value="generation" label="Geração" id="project-tab-generation" aria-controls="project-panel-generation"/>}
          {!project.is_inbox && <Tab value="files" label="Arquivos" id="project-tab-files" aria-controls="project-panel-files"/>}
        </ProjectTabs>
      <ProjectTabPanel role="tabpanel" id="project-panel-overview" aria-labelledby="project-tab-overview" hidden={section !== "overview" || project.is_inbox}>
        <ProjectIdentity>
          {!project.is_inbox && (<ProjectCover project={project} onChange={updateCover}/>)}
          <ProjectSummary>
            <ProjectTitleGroup>
              <ProjectTitle component="h1">{project.title}</ProjectTitle>
              <CompactActionButton label="Editar informações" disabled={pending} onClick={() => setProperties(true)}><ComposeIcon /></CompactActionButton>
            </ProjectTitleGroup>
            {project.subtitle && <Typography>{project.subtitle}</Typography>}
            {project.author && (<Typography color="text.secondary">{project.author}</Typography>)}
            <Typography variant="body2" color="text.secondary">
              {primary.length} {primary.length === 1 ? "texto" : "textos"}
            </Typography>
          </ProjectSummary>
        </ProjectIdentity>
      </ProjectTabPanel>

        <ProjectTabPanel role="tabpanel" id="project-panel-chapters" aria-labelledby="project-tab-chapters" hidden={section !== "chapters" && !project.is_inbox}>
          <ProjectPanelToolbar>
            <Typography component="h2" variant="body1">
              Sumário
            </Typography>
            <HeaderActions>
              <CompactActionButton label="Copiar todos os textos" disabled={pending || !primary.some((text) => text.markdown.trim())} onClick={copyTexts}><CopyIcon /></CompactActionButton>
              <Button component={Link} href={`/projects/${project.id}/new?group=${data.group.id}`} disabled={pending}>
                + Adicionar texto
              </Button>
            </HeaderActions>
          </ProjectPanelToolbar>
          {notice && <ProjectFeedback role="status">{notice}</ProjectFeedback>}
          {primary.length === 0 && (<Typography color="text.secondary">
              Adicione seu primeiro texto para começar.
            </Typography>)}
          {primary.map((text, index) => (<ChapterRow data-text-id={text.id} key={text.id}>
              <ChapterDragHandle disabled={pending} aria-label={`Reordenar ${text.title || `texto ${index + 1}`}`} title="Arraste para reordenar; use as setas do teclado quando focado" onPointerDown={(event) => beginDrag(event, text.id)} onPointerMove={dragOver} onPointerUp={finishDrag} onPointerCancel={finishDrag} onKeyDown={(event) => {
                if (["ArrowUp", "ArrowDown"].includes(event.key)) {
                    event.preventDefault();
                    void keyboardOrder(text.id, event.key === "ArrowUp" ? -1 : 1);
                }
            }}>
                ⠿
              </ChapterDragHandle>
              <Typography variant="caption" color="text.secondary">
                {String(index + 1).padStart(2, "0")}
              </Typography>
              <ChapterReadButton disabled={pending} onClick={() => { setReadingTextId(text.id); setRightOpen(true); }}>
                {text.title || "Sem título"}
              </ChapterReadButton>
              <Typography variant="caption" color="text.secondary">
                {text.markdown.trim()
                ? text.markdown.trim().split(/\s+/).length
                : 0}{" "}
                palavras
              </Typography>
              <Tooltip title="Editar texto">
                <span><IconButton component={Link} href={`/texts/${text.id}`} disabled={pending} aria-label={`Editar ${text.title || "texto sem título"}`}>
                  <ComposeIcon />
                </IconButton></span>
              </Tooltip>
            </ChapterRow>))}
        </ProjectTabPanel>
        {!project.is_inbox && (<ProjectTabPanel role="tabpanel" id="project-panel-files" aria-labelledby="project-tab-files" hidden={section !== "files"}>
            <ProjectFiles project={project} assets={data.assets ?? []} onChange={updateCover}/>
          </ProjectTabPanel>)}
        {!project.is_inbox && <>
          <ProjectTabPanel role="tabpanel" id="project-panel-markdown" aria-labelledby="project-tab-markdown" hidden={section !== "markdown"}>
            <ProjectMarkdown key={data.group.id} groupId={data.group.id} groups={data.groups} projectId={project.id} onRead={setReadingMarkdown} onBusy={setImportPending} blocked={pending} onExtracted={refreshAfterImport}/>
          </ProjectTabPanel>
          <ProjectTabPanel role="tabpanel" id="project-panel-imports" aria-labelledby="project-tab-imports" hidden={section !== "imports"}>
            <ProjectEpubs key={data.group.id} groupId={data.group.id} groups={data.groups} projectId={project.id} jobs={data.imports ?? []} onJob={updateImport} onExtracted={refreshAfterImport} onBusy={setImportPending} blocked={pending}/>
          </ProjectTabPanel>
          <ProjectTabPanel role="tabpanel" id="project-panel-generation" aria-labelledby="project-tab-generation" hidden={section !== "generation"}>
            <ProjectExport key={data.group.id} groupId={data.group.id} artifact={data.epub ?? null} hasContent={primary.some((text) => text.markdown.trim())} onChange={updateEpub} blocked={pending} onBusy={setImportPending}/>
          </ProjectTabPanel>
        </>}
      </Card>
      <ProjectReading document={reading}/>
    </Stack>);
}
