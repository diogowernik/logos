"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DeleteIcon } from "@/components/icons/NavigationIcons";
import { errorMessage, libraryRequest } from "./api";
import type { EpubArtifact } from "./types";
import { EpubReadButton } from "./EpubReader";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import {
  BookExport,
  ProjectFileRow,
  ProjectFileInfo,
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
  groupId,
  artifact,
  hasContent,
  onChange,
  blocked = false,
  onBusy,
  actionsHost,
}: {
  actionsHost?: HTMLDivElement | null;
  groupId: number;
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
      await libraryRequest(`groups/${groupId}/epub`, "DELETE");
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
          `groups/${groupId}/epub`,
          "POST",
        ),
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  const generateButton = <Button
    disabled={pending || blocked || confirmDelete || !hasContent}
    onClick={generate}
  >{pending ? "Gerando EPUB…" : artifact ? "Gerar novamente" : "Gerar EPUB"}</Button>;

  return (
    <>
      {actionsHost ? createPortal(generateButton, actionsHost) : generateButton}
      {(artifact || (error && !confirmDelete)) && <BookExport>
      <Stack component="section" spacing={1} aria-label="EPUB gerado">
      {error && !confirmDelete && <Alert severity="error">{error}</Alert>}
      {artifact && !artifact.is_current && <Alert severity="info">Os textos ou informações mudaram desde a geração deste EPUB.</Alert>}
      {artifact && (
        <ProjectFileRow>
          <ProjectFileInfo>
            <HeaderActions>
            <Link aria-label="Baixar EPUB" href={artifact.url} download={artifact.filename}>{artifact.filename}</Link>
            <EpubReadButton url={artifact.url} filename={artifact.filename} disabled={pending || blocked}/>
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
            <Typography variant="caption" color="text.secondary">
              Gerado em{" "}
              {new Date(artifact.created_at).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </Typography>
          </ProjectFileInfo>
        </ProjectFileRow>
      )}
      </Stack>
      </BookExport>}
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
    </>
  );
}
