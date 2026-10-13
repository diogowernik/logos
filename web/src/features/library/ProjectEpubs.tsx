"use client";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";
import { useRef } from "react";
import Link from "@mui/material/Link";
import { BookSection } from "./BookSection";
import { UploadIcon, ExtractIcon, CleanIcon, RefreshIcon } from "@/components/icons/NavigationIcons";
import { HeaderActions, CompactActionButton } from "@/components/ui/HeaderControls";
import { BookSourceRow, ProjectFileInfo } from "@/theme/project";
import { LocalEpubs } from "./LocalEpubs";
import type { EpubImportJob } from "./import-types";
import { importDiagnostic } from "./import-types";
import { useEpubImport } from "./useEpubImport";
import { ImportFeedback } from "./ImportFeedback";
import { ImportWarnings } from "./ImportWarnings";
import { EpubCleanDialog } from "./EpubCleanDialog";
import { EpubReadButton } from "./EpubReader";
import { TextImportDialog } from "./TextImportDialog";
import { ImportSourceSelect } from "@/theme/epub-import";
export function ProjectEpubs({ projectId, groupId, groups, jobs, onJob, onExtracted, onBusy, onLocalBusy, blocked = false, expanded, onToggle, onRead, }: {
    onRead?: (document: import("./ProjectReading").ReadingDocument) => void;
    expanded?: boolean;
    onToggle?: () => void;
    onLocalBusy?: (busy: boolean) => void;
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
    const controller = useEpubImport({ projectId, groupId, jobs, onJob, onExtracted, onBusy, onRead });
    const { job, pending, cleanOpen, previewOpen } = controller;
    return (<BookSection title="EPUBs de origem" expanded={expanded} onToggle={onToggle} actions={<HeaderActions>
      <CompactActionButton label="Importar EPUB" disabled={blocked || Boolean(pending)} onClick={() => input.current?.click()}><UploadIcon /></CompactActionButton>
    </HeaderActions>}>
      <Stack spacing={1}>
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
          <BookSourceRow>
            <ProjectFileInfo>
              <Link href={job.original_url} download={job.original_name}>{job.original_name}</Link>
            </ProjectFileInfo>
            <HeaderActions>
              <EpubReadButton url={job.original_url} filename={job.original_name} disabled={blocked || Boolean(pending)}/>
              <CompactActionButton label="Gerar EPUB limpo" disabled={blocked || Boolean(pending) || job.status === "processing"} onClick={controller.reviewClean}><CleanIcon /></CompactActionButton>
              <CompactActionButton label="Criar textos a partir do EPUB original" tooltip="Criar textos a partir desse EPUB" disabled={blocked || Boolean(pending)} onClick={() => controller.loadPreview("original")}><ExtractIcon /></CompactActionButton>
            </HeaderActions>
          </BookSourceRow>
          <ImportWarnings importId={job.id} warnings={job.clean_url ? (job.clean_report.warnings ?? []) : job.inspection.warnings}/>
          {job.status === "processing" && <HeaderActions>
            <Typography role="status" variant="body2">Limpeza em andamento.</Typography>
            <CompactActionButton label="Atualizar limpeza" disabled={blocked || Boolean(pending)} onClick={controller.refreshJob}><RefreshIcon /></CompactActionButton>
          </HeaderActions>}
          {job.clean_url && <BookSourceRow>
            <ProjectFileInfo><Link href={job.clean_url} download={job.clean_filename}>{job.clean_filename}</Link></ProjectFileInfo>
            <HeaderActions>
            <EpubReadButton url={job.clean_url} filename={job.clean_filename} disabled={blocked || Boolean(pending)}/>
            <CompactActionButton label="Criar textos a partir do EPUB limpo" tooltip="Criar textos a partir desse EPUB" disabled={blocked || Boolean(pending)} onClick={() => controller.loadPreview("cleaned")}><ExtractIcon /></CompactActionButton>
            </HeaderActions>
          </BookSourceRow>}
          <EpubCleanDialog key={job.id} job={job} open={cleanOpen} selected={controller.sections} onSelection={controller.setSections} onClose={() => controller.setCleanOpen(false)} onClean={controller.clean} pending={pending} error={controller.error}/>
          <TextImportDialog destination={{groups, target: controller.target, name: controller.newName, disabled: Boolean(pending), onName: controller.setNewName, onTarget: (next) => { void controller.loadPreview(controller.source, next); }}} open={previewOpen} preview={controller.preview} source={controller.source} stale={controller.stale} pending={pending} error={controller.error} onClose={() => controller.setPreviewOpen(false)} onReload={() => controller.loadPreview(controller.source)} onExtract={controller.extract}/>
        </> : null}
      </Stack>
      <LocalEpubs projectId={projectId} onJob={onJob} onBusy={onLocalBusy ?? onBusy} compact blocked={blocked || Boolean(pending)} onSelect={controller.select}/>
    </BookSection>);
}
