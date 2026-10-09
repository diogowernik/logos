"use client";

import { useEffect, useState } from "react";
import { DeleteIcon, DownloadIcon } from "@/components/icons/NavigationIcons";
import { errorMessage, libraryRequest } from "./api";
import type { EpubArtifact } from "./types";
import Stack from "@mui/material/Stack";
import {
  ProjectPanelToolbar,
  ProjectPlannedTools,
  ProjectFileRow,
  ProjectFileInfo,
  ProjectFileName,
} from "@/theme/project";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import {
  CompactActionButton,
  HeaderActions,
} from "@/components/ui/HeaderControls";

export function ProjectExport({
  projectId,
  artifact,
  hasContent,
  onChange,
  blocked = false,
  onBusy,
}: {
  projectId: number;
  artifact: EpubArtifact | null;
  hasContent: boolean;
  onChange: (artifact: EpubArtifact | null) => void;
  blocked?: boolean;
  onBusy?: (busy: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    onBusy?.(pending);
    return () => onBusy?.(false);
  }, [pending, onBusy]);

  async function remove() {
    setPending(true);
    setError("");
    try {
      await libraryRequest(`projects/${projectId}/epub`, "DELETE");
      onChange(null);
      setConfirmDelete(false);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  async function generate() {
    setPending(true);
    setError("");
    try {
      onChange(
        await libraryRequest<EpubArtifact>(
          `projects/${projectId}/epub`,
          "POST",
        ),
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <Stack component="section" spacing={1} aria-label="EPUB gerado">
      <ProjectPanelToolbar>
        <Typography component="h2" variant="body1">
          Última geração
        </Typography>
        <HeaderActions>
          <Button
            disabled={pending || blocked || confirmDelete || !hasContent}
            onClick={generate}
          >
            {pending
              ? "Gerando EPUB…"
              : artifact
                ? "Gerar novamente"
                : "Gerar EPUB"}
          </Button>
        </HeaderActions>
      </ProjectPanelToolbar>
      {error && !confirmDelete && <Alert severity="error">{error}</Alert>}
      {artifact ? (
        <ProjectFileRow>
          <ProjectFileInfo>
            <ProjectFileName>{artifact.filename}</ProjectFileName>
            <Typography variant="caption" color="text.secondary">
              Gerado em{" "}
              {new Date(artifact.created_at).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </Typography>
          </ProjectFileInfo>
          <HeaderActions>
            <Button
              component="a"
              href={artifact.url}
              download={artifact.filename}
              startIcon={<DownloadIcon />}
            >
              Baixar EPUB
            </Button>
            <CompactActionButton
              label="Excluir EPUB"
              disabled={pending || blocked}
              onClick={() => {
                setError("");
                setConfirmDelete(true);
              }}
            >
              <DeleteIcon />
            </CompactActionButton>
          </HeaderActions>
        </ProjectFileRow>
      ) : (
        <Typography color="text.secondary">Nenhum EPUB gerado.</Typography>
      )}
      <ProjectPlannedTools>
        <Typography component="h3" variant="body2" color="text.secondary">
          Histórico de gerações
        </Typography>
        <HeaderActions>
          <Button disabled>Ver gerações anteriores (em planejamento)</Button>
        </HeaderActions>
      </ProjectPlannedTools>
      <Dialog
        open={confirmDelete}
        onClose={pending ? undefined : () => setConfirmDelete(false)}
        aria-labelledby="delete-epub-title"
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle id="delete-epub-title">Excluir EPUB gerado?</DialogTitle>
        <DialogContent>
          <Typography>{artifact?.filename}</Typography>
          <Typography>
            Os textos e as imagens do livro serão mantidos.
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button disabled={pending} onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button color="error" disabled={pending} onClick={remove}>
            {pending ? "Excluindo…" : "Excluir EPUB"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
