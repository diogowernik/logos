"use client";

import { useState } from "react";
import { DownloadIcon } from "@/components/icons/NavigationIcons";
import { errorMessage, libraryRequest } from "./api";
import type { EpubArtifact } from "./types";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { HeaderActions } from "@/components/ui/HeaderControls";

export function ProjectExport({
  projectId,
  artifact,
  hasContent,
  onChange,
}: {
  projectId: number;
  artifact: EpubArtifact | null;
  hasContent: boolean;
  onChange: (artifact: EpubArtifact) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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
    <Card component="section" aria-label="EPUB">
      <CardHeader
        slotProps={{ title: { component: "h2", variant: "h6" } }}
        title="EPUB"
        action={
          <HeaderActions>
            <Button disabled={pending || !hasContent} onClick={generate}>
              {pending
                ? "Gerando EPUB…"
                : artifact
                  ? "Gerar novamente"
                  : "Gerar EPUB"}
            </Button>
            {artifact && (
              <Button
                component="a"
                href={artifact.url}
                download={artifact.filename}
                startIcon={<DownloadIcon />}
              >
                Baixar EPUB
              </Button>
            )}
          </HeaderActions>
        }
      />
      {(artifact || error) && (
        <CardContent>
          {artifact && (
            <Typography variant="caption" color="text.secondary">
              Gerado em{" "}
              {new Date(artifact.created_at).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </Typography>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </CardContent>
      )}
    </Card>
  );
}
