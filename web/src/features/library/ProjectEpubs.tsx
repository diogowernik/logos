"use client";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import { useRef } from "react";
import { UploadIcon } from "@/components/icons/NavigationIcons";
import { HeaderActions } from "@/components/ui/HeaderControls";
import { ProjectEpubSections, ProjectPanelToolbar } from "@/theme/project";
import { LocalEpubs } from "./LocalEpubs";
import type { EpubImportJob } from "./import-types";
import { importDiagnostic } from "./import-types";
import { useEpubImport } from "./useEpubImport";
import { ImportFeedback } from "./ImportFeedback";
import { ImportWarnings } from "./ImportWarnings";
import { EpubCleanDialog } from "./EpubCleanDialog";
import { TextImportDialog } from "./TextImportDialog";
import { ImportSourceSelect } from "@/theme/epub-import";
export function ProjectEpubs({ projectId, groupId, groups, jobs, onJob, onExtracted, onBusy, blocked = false, }: {
    projectId: number;
    groupId: number;
    groups: import("./types").TextGroup[];
    jobs: EpubImportJob[];
    onJob: (job: EpubImportJob) => void;
    onExtracted: (groupId?: number) => Promise<void>;
    onBusy: (busy: boolean) => void;
    blocked?: boolean;
}) {
    const input = useRef<HTMLInputElement>(null);
    const controller = useEpubImport({ projectId, groupId, jobs, onJob, onExtracted, onBusy });
    const { job, pending, cleanOpen, previewOpen } = controller;
    return (<ProjectEpubSections>
      <Stack component="section" spacing={1} aria-labelledby="epub-import-title">
        <ProjectPanelToolbar>
          <Stack>
            <Typography component="h2" variant="body1" id="epub-import-title">
              EPUB importado
            </Typography>
          </Stack>
          <HeaderActions>
            <Button disabled={blocked || Boolean(pending)} startIcon={<UploadIcon />} onClick={() => input.current?.click()}>
              Importar EPUB
            </Button>
          </HeaderActions>
        </ProjectPanelToolbar>
        <input ref={input} type="file" accept=".epub,application/epub+zip" hidden aria-label="Arquivo EPUB" disabled={blocked || Boolean(pending)} onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file)
                void controller.upload(file);
        }}/>
        {jobs.length > 1 && <ImportSourceSelect select label="EPUB de origem" value={controller.selectedId} disabled={blocked || Boolean(pending)} onChange={(event) => controller.select(event.target.value)}>
          {jobs.map((item) => <MenuItem key={item.id} value={item.id}>{item.original_name}</MenuItem>)}
        </ImportSourceSelect>}
        {!cleanOpen && !previewOpen && <ImportFeedback key={job?.id ?? "upload"} error={controller.error} diagnostic={controller.error ? null : importDiagnostic(job?.error_diagnostic)}/>}
        {controller.notice && <Typography role="status" variant="body2" color="text.secondary">{controller.notice}</Typography>}
        {pending && !cleanOpen && !previewOpen && <Typography role="status">{pending}</Typography>}
        {job ? <>
          <ProjectPanelToolbar>
            <Stack>
              <Typography>{job.original_name}</Typography>
              <Typography variant="caption" color="text.secondary">Original · {job.inspection.sections.length} seções</Typography>
            </Stack>
            <HeaderActions>
              <Button component="a" href={job.original_url} download={job.original_name}>Baixar original</Button>
              <Button disabled={blocked || Boolean(pending)} onClick={() => controller.loadPreview("original")}>Extrair do original</Button>
            </HeaderActions>
          </ProjectPanelToolbar>
          <ImportWarnings warnings={job.clean_url ? (job.clean_report.warnings ?? []) : job.inspection.warnings}/>
          <ProjectPanelToolbar>
            <Stack>
              <Typography variant="body2" color="text.secondary">{job.clean_filename || "Nenhuma cópia limpa gerada."}</Typography>
              {job.status === "processing" && <Typography variant="caption" role="status">Limpeza em andamento. Atualize para consultar o resultado.</Typography>}
            </Stack>
            <HeaderActions>
              <Button disabled={blocked || Boolean(pending)} onClick={controller.refreshJob}>Atualizar</Button>
              <Button disabled={blocked || Boolean(pending) || job.status === "processing"} onClick={controller.reviewClean}>{job.clean_url ? "Limpar novamente" : "Limpar EPUB"}</Button>
              {job.clean_url && <>
                <Button component="a" href={job.clean_url} download={job.clean_filename}>Baixar limpo</Button>
                <Button disabled={blocked || Boolean(pending)} onClick={() => controller.loadPreview("cleaned")}>Extrair do limpo</Button>
              </>}
            </HeaderActions>
          </ProjectPanelToolbar>
          <EpubCleanDialog job={job} open={cleanOpen} selected={controller.sections} onSelection={controller.setSections} onClose={() => controller.setCleanOpen(false)} onClean={controller.clean} pending={pending} error={controller.error}/>
          <TextImportDialog destination={{groups, target: controller.target, name: controller.newName, disabled: Boolean(pending), onName: controller.setNewName, onTarget: (next) => { void controller.loadPreview(controller.source, next); }}} open={previewOpen} preview={controller.preview} source={controller.source} stale={controller.stale} pending={pending} error={controller.error} onClose={() => controller.setPreviewOpen(false)} onReload={() => controller.loadPreview(controller.source)} onExtract={controller.extract}/>
        </> : <Typography variant="body2" color="text.secondary">Nenhum EPUB importado.</Typography>}
      </Stack>
      <LocalEpubs projectId={projectId} onJob={onJob} onBusy={onBusy} blocked={blocked || Boolean(pending)} onSelect={controller.select}/>
    </ProjectEpubSections>);
}
