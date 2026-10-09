"use client";

import { useState } from "react";
import {
  ImageIcon,
  CopyIcon,
  DeleteIcon,
  UploadIcon,
} from "@/components/icons/NavigationIcons";
import { PrivateImage } from "@/components/PrivateImage";
import { errorMessage, libraryRequest } from "./api";
import type { Asset, Project } from "./types";
import {
  ProjectFileRow,
  ProjectFileLink,
  ProjectPanelToolbar,
} from "@/theme/project";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import {
  HeaderActions,
  CompactActionButton,
} from "@/components/ui/HeaderControls";

export function ProjectFiles({
  project,
  assets,
  onChange,
}: {
  project: Project;
  assets: Asset[];
  onChange: (project: Project) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function chooseCover(id: string | null) {
    setPending(true);
    setError("");
    try {
      onChange(
        await libraryRequest<Project>(`projects/${project.id}`, "PATCH", {
          cover: id,
        }),
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <Stack component="section" spacing={1} aria-label="Arquivos do livro">
      <ProjectPanelToolbar>
        <Typography component="h2" variant="body1">
          Arquivos
        </Typography>
        <HeaderActions>
          {project.cover && (
            <Button
              variant="text"
              disabled={pending}
              onClick={() => chooseCover(null)}
            >
              Remover capa
            </Button>
          )}
          <CompactActionButton
            label="Enviar arquivo (em planejamento)"
            disabled
          >
            <UploadIcon />
          </CompactActionButton>
        </HeaderActions>
      </ProjectPanelToolbar>
      {!assets.length && (
        <Typography color="text.secondary">Nenhum arquivo enviado.</Typography>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {assets.map((asset) => (
        <ProjectFileRow key={asset.id}>
          {asset.mime_type.startsWith("image/") && (
            <PrivateImage src={asset.url} alt="" loading="lazy" />
          )}
          <ProjectFileLink
            component="a"
            href={asset.url}
            target="_blank"
            rel="noreferrer"
          >
            {asset.original_name}
          </ProjectFileLink>
          {project.cover === asset.id ? (
            <Typography variant="caption" color="text.secondary">
              Capa
            </Typography>
          ) : asset.mime_type.startsWith("image/") ? (
            <CompactActionButton
              label={`Usar ${asset.original_name} como capa`}
              disabled={pending}
              onClick={() => chooseCover(asset.id)}
            >
              <ImageIcon />
            </CompactActionButton>
          ) : null}
          <HeaderActions>
            <CompactActionButton
              label={`Copiar endereço de ${asset.original_name} (em planejamento)`}
              disabled
            >
              <CopyIcon />
            </CompactActionButton>
            <CompactActionButton
              label={`Excluir ${asset.original_name} (em planejamento)`}
              disabled
            >
              <DeleteIcon />
            </CompactActionButton>
          </HeaderActions>
        </ProjectFileRow>
      ))}
    </Stack>
  );
}
