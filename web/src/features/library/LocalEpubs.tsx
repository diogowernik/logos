"use client";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { HeaderActions } from "@/components/ui/HeaderControls";
import { ProjectFileInfo, ProjectFileName, ProjectFileRow, ProjectPanelToolbar } from "@/theme/project";
import { libraryRequest } from "./api";
import { ImportFeedback } from "./ImportFeedback";
import { useSourceFolder } from "./useSourceFolder";
import type { EpubImportJob } from "./import-types";
import type { SourceFile } from "./source-types";
const labels = { unregistered: "Na pasta · disponível para vincular", registered: "Vinculado", missing: "Arquivo não encontrado", changed: "Arquivo alterado · confira a fonte original", new: "", imported: "", text_missing: "" };
export function LocalEpubs({ projectId, onJob, onBusy, blocked, onSelect }: {
    projectId: number;
    onJob: (job: EpubImportJob) => void;
    onBusy: (busy: boolean) => void;
    blocked: boolean;
    onSelect: (id: string) => void;
}) {
    const folder = useSourceFolder(projectId, "epub", onBusy);
    async function link(file: SourceFile) {
        await folder.run("Vinculando EPUB…", async () => {
            const job = await libraryRequest<EpubImportJob>(`projects/${projectId}/link-epub`, "POST", { name: file.name, sha256: file.sha256 });
            if (!folder.mounted.current)
                return;
            onJob(job);
            onSelect(job.id);
            folder.notify("EPUB vinculado.");
            await folder.refresh();
        });
    }
    return <Stack component="section" spacing={1} aria-label="EPUBs da pasta">
    <ProjectPanelToolbar>
      <Typography component="h3" variant="body2">Fontes da pasta</Typography>
      <HeaderActions><Button disabled={blocked || Boolean(folder.pending)} onClick={() => folder.run("Atualizando pasta…", folder.refresh)}>Atualizar pasta</Button></HeaderActions>
    </ProjectPanelToolbar>
    <ImportFeedback error={folder.error}/>
    {folder.notice && <Typography role="status" variant="body2">{folder.notice}</Typography>}
    {folder.pending && <Typography role="status" variant="body2">{folder.pending}</Typography>}
    {folder.loading ? <Typography variant="body2" color="text.secondary">Consultando pasta…</Typography> : !folder.files.length && <Typography variant="body2" color="text.secondary">Nenhum EPUB na pasta.</Typography>}
    {folder.files.map((file) => <ProjectFileRow key={file.name}>
      <ProjectFileInfo><ProjectFileName>{file.display_name ?? file.name}</ProjectFileName><Typography variant="caption" color={file.status === "missing" || file.status === "changed" ? "warning.main" : "text.secondary"}>{labels[file.status]}</Typography></ProjectFileInfo>
      {file.status === "unregistered" && <Button disabled={blocked || Boolean(folder.pending)} onClick={() => link(file)}>Vincular</Button>}
      {file.status === "registered" && file.job && <Button disabled={blocked || Boolean(folder.pending)} onClick={() => onSelect(file.job!)}>Selecionar</Button>}
    </ProjectFileRow>)}
  </Stack>;
}
